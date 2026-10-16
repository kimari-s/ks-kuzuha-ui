import "./styles.css";
import { loadRuntimeConfig } from "./instance";

// The optional config.json next to index.html is merged into the instance
// config first; the app (whose modules read the config when they load) is
// imported only after that. See instance.ts.
void loadRuntimeConfig().then(() => import("./boot"));
