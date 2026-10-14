//
// Copyright 2026 DXOS.org
//

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Arrays;

import org.apache.jena.query.Dataset;
import org.apache.jena.query.Query;
import org.apache.jena.query.QueryExecution;
import org.apache.jena.query.QueryExecutionFactory;
import org.apache.jena.query.QueryFactory;
import org.apache.jena.query.ResultSetFormatter;
import org.apache.jena.riot.Lang;
import org.apache.jena.riot.RDFDataMgr;

/**
 * Runs SPARQL queries with Jena ARQ for the differential script, writing `<name>.srj` (SELECT/ASK),
 * `<name>.nt` (CONSTRUCT) or `<name>.err` next to each `<name>.rq`.
 *   java -cp 'apache-jena/lib/*' JenaBatch.java batch data.nq queries/   (one dataset, loaded once)
 *   java -cp 'apache-jena/lib/*' JenaBatch.java cases cases/             (each subdirectory: data.nq + query.rq)
 */
public class JenaBatch {
  public static void main(String[] args) throws Exception {
    if (args[0].equals("cases")) {
      File[] cases = new File(args[1]).listFiles(File::isDirectory);
      Arrays.sort(cases);
      for (File dir : cases) {
        run(RDFDataMgr.loadDataset(new File(dir, "data.nq").getPath()), new File(dir, "query.rq"));
      }
      return;
    }
    Dataset dataset = RDFDataMgr.loadDataset(args[1]);
    File[] queries = new File(args[2]).listFiles((dir, name) -> name.endsWith(".rq"));
    Arrays.sort(queries);
    for (File file : queries) {
      run(dataset, file);
    }
  }

  private static void run(Dataset dataset, File file) throws Exception {
    String base = file.getPath().substring(0, file.getPath().length() - 3);
    try {
      Query query = QueryFactory.create(Files.readString(file.toPath(), StandardCharsets.UTF_8));
      try (QueryExecution exec = QueryExecutionFactory.create(query, dataset)) {
        if (query.isSelectType()) {
          try (OutputStream out = new FileOutputStream(base + ".srj")) {
            ResultSetFormatter.outputAsJSON(out, exec.execSelect());
          }
        } else if (query.isAskType()) {
          try (OutputStream out = new FileOutputStream(base + ".srj")) {
            ResultSetFormatter.outputAsJSON(out, exec.execAsk());
          }
        } else {
          try (OutputStream out = new FileOutputStream(base + ".nt")) {
            RDFDataMgr.write(out, exec.execConstruct(), Lang.NTRIPLES);
          }
        }
      }
    } catch (Exception error) {
      Files.writeString(new File(base + ".err").toPath(), String.valueOf(error.getMessage()));
    }
  }
}
