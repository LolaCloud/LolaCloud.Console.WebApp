import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { getCurrentUserData } from "../api";
import { useOperator } from "../store/operator.store";

export function CIRouterProtector({ children }: { children: ReactNode }) {
    const { pathname } = useLocation()
    const { setCurrentOperator } = useOperator()

    useEffect(() => {
        const loadOperator = async () => {
            const meData = await getCurrentUserData();
            setCurrentOperator(meData.operator)
        }

        pathname != '/ci/sign-in' && loadOperator()
    }, [pathname])

    return children
}