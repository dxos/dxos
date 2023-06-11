import requests

# TODO(burdon): Setup?
# python3 -m pip install requests

def query():
  url = "http://localhost:3000/query"
  headers = {"Content-type": "application/json", "Accept": "text/plain"}
  data = {"root": { "filter": { "type": "org.dxos/type/test" } } }
  r = requests.post(url, headers=headers, json=data)
  print(r.json())

query()
