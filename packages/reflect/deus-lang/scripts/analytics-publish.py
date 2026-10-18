#!/usr/bin/env python3
#
# Copyright 2026 DXOS.org
#

"""Registers the Parquet files `deus event push` wrote as Iceberg tables, so SQL can query them (D96).

Clients only push files; this publisher is the one writer of the catalog. Each event type is one
table, `deus.<type>` (`Events.TestRun` -> `deus.test_run`). A type whose fields changed has a new
hash and writes under a new folder; its files join the same table after the schema is widened by name.
Already registered files are skipped, so a rerun is safe.

  --local <warehouse>   a SQLite catalog in <warehouse>, over a directory remote (tests, and the default)
  --basin               Cloudflare Basin Catalog (formerly R2 Data Catalog) over the R2 bucket; needs
                        BASIN_CATALOG_URI, BASIN_WAREHOUSE and BASIN_TOKEN, and changes shared state;
                        BASIN_S3_ENDPOINT, BASIN_S3_KEY_ID and BASIN_S3_SECRET name the bucket's S3 keys

Usage: analytics-publish.py <remote dir, s3://bucket/prefix or https://host/v1/project> (--local <warehouse> | --basin) [--query SQL]

Only --local has been run end to end; --basin follows Cloudflare's documented Iceberg REST catalog.

Needs pyiceberg[pyarrow,sql-sqlite]; --query also needs duckdb.
"""

import argparse
import os
import re
import sys

import pyarrow.parquet as pq
from pyiceberg.catalog import load_catalog
from pyiceberg.exceptions import NamespaceAlreadyExistsError, NoSuchTableError


def table_name(event_type):
    """`Events.TestRun` -> `test_run`."""
    last = event_type.split('.')[-1]
    return re.sub(r'(?<!^)(?=[A-Z])', '_', last).lower()


def event_files(remote):
    """(event type, file URI or path) for every pushed Parquet file under a directory remote."""
    root = os.path.join(remote, 'events')
    for event_type in sorted(os.listdir(root)):
        for type_hash in sorted(os.listdir(os.path.join(root, event_type))):
            folder = os.path.join(root, event_type, type_hash)
            for name in sorted(os.listdir(folder)):
                if name.endswith('.parquet'):
                    yield event_type, os.path.abspath(os.path.join(folder, name))


def s3_settings():
    """Endpoint and key pair for the bucket: the Basin bucket's own (`BASIN_S3_*`) or the R2 keys a thread has."""
    return (os.environ.get('BASIN_S3_ENDPOINT') or os.environ['DEUS_R2_ENDPOINT'],
            os.environ.get('BASIN_S3_KEY_ID') or os.environ['R2_ACCESS_KEY_ID'],
            os.environ.get('BASIN_S3_SECRET') or os.environ['R2_SECRET_ACCESS_KEY'])


def r2_filesystem():
    from pyarrow import fs
    endpoint, key_id, secret = s3_settings()
    return fs.S3FileSystem(endpoint_override=endpoint, access_key=key_id, secret_key=secret, region='auto')


def r2_event_files(remote):
    """The same over an `s3://bucket/prefix` remote on R2 (the bucket a `deus remote add … r2://…` names)."""
    from pyarrow import fs
    bucket_prefix = remote[len('s3://'):].rstrip('/')
    selector = fs.FileSelector(bucket_prefix + '/events', recursive=True)
    for info in sorted(r2_filesystem().get_file_info(selector), key=lambda i: i.path):
        if info.path.endswith('.parquet'):
            yield info.path[len(bucket_prefix) + 1:].split('/')[1], 's3://' + info.path


def catalog_for(args):
    if args.basin:
        for key in ('BASIN_CATALOG_URI', 'BASIN_WAREHOUSE', 'BASIN_TOKEN'):
            if not os.environ.get(key):
                sys.exit(f'${key} is not set')
        endpoint, key_id, secret = s3_settings()
        return load_catalog('basin', type='rest', uri=os.environ['BASIN_CATALOG_URI'],
                            warehouse=os.environ['BASIN_WAREHOUSE'], token=os.environ['BASIN_TOKEN'],
                            **{'s3.endpoint': endpoint, 's3.access-key-id': key_id, 's3.secret-access-key': secret, 's3.region': 'auto'})
    warehouse = os.path.abspath(args.local)
    os.makedirs(warehouse, exist_ok=True)
    return load_catalog('local', type='sql', uri=f'sqlite:///{warehouse}/catalog.db', warehouse=f'file://{warehouse}')


def worker_event_files(remote, bucket):
    """The same over the DEUS Worker (`https://host/v1/<project>`, D164), which stores `<project>/events/` in `bucket`;
    the Worker lists, and the files are named by their S3 URI so the catalog reads them in place."""
    import urllib.request
    project = remote.rstrip('/').split('/')[-1]
    # Cloudflare refuses urllib's default User-Agent with a 403.
    request = urllib.request.Request(remote.rstrip('/') + '/files/events/', headers={'User-Agent': 'deus-analytics-publish'})
    with urllib.request.urlopen(request) as response:
        keys = response.read().decode('utf8').split()
    for key in sorted(keys):
        if key.endswith('.parquet'):
            yield key.split('/')[0], f's3://{bucket}/{project}/events/{key}'


def publish(catalog, files):
    try:
        catalog.create_namespace('deus')
    except NamespaceAlreadyExistsError:
        pass
    added = {}
    for event_type, path in files:
        identifier = ('deus', table_name(event_type))
        schema = pq.read_schema(path[len('s3://'):], filesystem=r2_filesystem()) if path.startswith('s3://') else pq.read_schema(path)
        try:
            table = catalog.load_table(identifier)
        except NoSuchTableError:
            table = catalog.create_table(identifier, schema=schema.remove_metadata())
        known = set(table.inspect.files().column('file_path').to_pylist()) if table.current_snapshot() else set()
        uri = path if '://' in path else 'file://' + path
        if uri in known or path in known:
            continue
        with table.update_schema() as update:
            update.union_by_name(schema.remove_metadata())
        table.add_files([uri])
        added[identifier[1]] = added.get(identifier[1], 0) + 1
    return added


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('remote')
    target = parser.add_mutually_exclusive_group(required=True)
    target.add_argument('--local', metavar='WAREHOUSE')
    target.add_argument('--basin', action='store_true')
    parser.add_argument('--bucket', default='deus-codebases', help='the bucket behind an https:// Worker remote')
    parser.add_argument('--query', help='SQL over the tables after publishing (local only), e.g. "select count(*) from test_run"')
    args = parser.parse_args()

    catalog = catalog_for(args)
    if args.remote.startswith('https://'):
        files = list(worker_event_files(args.remote, args.bucket))
    elif args.remote.startswith('s3://'):
        files = list(r2_event_files(args.remote))
    else:
        files = list(event_files(args.remote))
    added = publish(catalog, files)
    for table, n in sorted(added.items()):
        print(f'deus.{table}: {n} new files')
    if not added:
        print('Nothing new to publish.')

    if args.query:
        import duckdb
        con = duckdb.connect()
        for identifier in catalog.list_tables('deus'):
            name = identifier[-1]
            con.register(name, catalog.load_table(identifier).scan().to_arrow())
        print(con.sql(args.query))


if __name__ == '__main__':
    main()
