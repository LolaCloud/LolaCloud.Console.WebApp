import { BrowserRouter } from "react-router-dom";
import { CIRouter } from "./modules/ci/router";
import { Toaster } from "./components/ui/sonner";

export function App() {
    return (
        <BrowserRouter>
            <CIRouter />
            <Toaster/>
        </BrowserRouter>
    )
}

export default App;