//
// Copyright 2026 DXOS.org
//

import java.io.File;

import benchmark.testdriver.LocalSPARQLParameterPool;
import benchmark.testdriver.Query;

/**
 * Instantiates the BSBM explore query templates with the official test driver's parameter pool, so the
 * parameters follow BSBM's own distributions. Prints one JSON object per line: {"q":N,"i":K,"sparql":"..."}.
 * Usage: java -cp bsbm.jar:...:. BsbmParams <bsbmtools dir> <td_data dir> <instances per query> [seed]
 */
public class BsbmParams {
  public static void main(String[] args) throws Exception {
    File tools = new File(args[0]);
    File td = new File(args[1]);
    int count = Integer.parseInt(args[2]);
    long seed = args.length > 3 ? Long.parseLong(args[3]) : 808080L;
    LocalSPARQLParameterPool pool = new LocalSPARQLParameterPool(td, seed);
    for (int nr = 1; nr <= 12; nr++) {
      File dir = new File(tools, "queries/explore");
      Query query = new Query(new File(dir, "query" + nr + ".txt"), new File(dir, "query" + nr + "desc.txt"), "%");
      for (int instance = 0; instance < count; instance++) {
        query.setParameters(pool.getParametersForQuery(query));
        String text = query.getQueryString();
        StringBuilder escaped = new StringBuilder();
        for (char ch : text.toCharArray()) {
          switch (ch) {
            case '"': escaped.append("\\\""); break;
            case '\\': escaped.append("\\\\"); break;
            case '\n': escaped.append("\\n"); break;
            case '\r': break;
            case '\t': escaped.append("\\t"); break;
            default: escaped.append(ch);
          }
        }
        System.out.println("{\"q\":" + nr + ",\"i\":" + instance + ",\"sparql\":\"" + escaped + "\"}");
      }
    }
  }
}
