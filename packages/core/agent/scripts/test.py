#
# Copyright 2023 DXOS.org
#

import json
import random
import requests

baseUrl = "http://localhost:3000"

def query_spaces():
  url = baseUrl + "/spaces"
  headers = {"Content-type": "application/json", "Accept": "text/plain"}
  r = requests.get(url, headers=headers)
  data = r.json()
  return data.get('spaces', [])

def query_objects(key):
  url = baseUrl + "/space/objects/" + key
  headers = {"Content-type": "application/json", "Accept": "text/plain"}
  r = requests.get(url, headers=headers)
  data = r.json()
  return data.get('objects', [])

def insert_objects(key, objects):
  url = baseUrl + "/space/objects/" + key
  headers = {"Content-type": "application/json", "Accept": "text/plain"}
  r = requests.post(url, headers=headers, data=json.dumps(objects))
  data = r.json()
  return data.get('objects', [])

spaces = query_spaces()
if len(spaces):
  spaceKey = spaces[0]['key']
  insert_objects(spaceKey, [{ "title": "object-" + str(random.randrange(0, 100)) }])
  objects = query_objects(spaceKey)
  print(json.dumps(objects, indent=2))
