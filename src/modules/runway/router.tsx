import { Route, Routes } from "react-router-dom";
import { RunwayPage } from "./screens/home/page";

export function RunwayRouter() {

    return (
        <Routes>
            <Route
                path='/runway'
                element={<RunwayPage />}
            />
        </Routes>
    )
}