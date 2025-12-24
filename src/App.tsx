import { BrowserRouter } from "react-router-dom";
import { CIRouter } from "./modules/ci/router";
import { Toaster } from "./components/ui/sonner";
import { getAccessToken } from "./modules/ci/utils";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function App() {

    const queryClient = new QueryClient()

    if (window.location.pathname != '/ci/sign-in' && getAccessToken() === null) {
        window.location.href = '/ci/sign-in'
    }

    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <CIRouter />
                <Toaster />
            </BrowserRouter>
        </QueryClientProvider>
    )
}

export default App;