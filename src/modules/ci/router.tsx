import { Route, Routes } from "react-router-dom";
import { SignInPage } from "./screens/sign-in/page";
import { OperatorsPage } from "./screens/operator/page";
import { CreateOperatorPage } from "./screens/operator/create/page";
import { EditOperatorPage } from "./screens/operator/edit/page";
import { CIPage } from "./screens/home/page";

export function CIRouter() {

    return (
        <Routes>
                <Route
                path='/ci'
                element={<CIPage />}
            />
            <Route
                path='/ci/sign-in'
                element={<SignInPage />}
            />
            <Route
                path='/ci/operator'
                element={<OperatorsPage />}
            />
            <Route
                path='/ci/operator/create'
                element={<CreateOperatorPage />}
            />
            <Route
                path='/ci/operator/edit/:operatorId'
                element={<EditOperatorPage />}
            />
        </Routes>
    )
}