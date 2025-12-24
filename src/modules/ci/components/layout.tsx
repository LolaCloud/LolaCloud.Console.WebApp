import { CIHeader } from "./header";
import type { ReactNode } from "react";
import { DefaultSidebar } from "@/components/default-sidebar";
import { BookTextIcon, FormIcon, UserIcon } from "lucide-react";

export function CILayout(
    {
        children
    }: {
        children: ReactNode
    }
) {
    return (
        <DefaultSidebar
            header={<CIHeader/>}
            groups={[{
                        items: [
                            {
                                icon: <BookTextIcon/>,
                                label: 'Core Identity',
                                pathChecker: p => p === '/ci',
                                url: '/ci'
                            },
                            {
                                icon: <UserIcon/>,
                                label: 'Operadores',
                                pathChecker: p => p.startsWith('/ci/operator'),
                                url: '/ci/operator'
                            },
                            {
                                icon: <FormIcon/>,
                                label: 'Papéis',
                                pathChecker: p => p.startsWith('/ci/role'),
                                url: '/ci/role'
                            },
                        ]
                    }]}
        >
            {children}
        </DefaultSidebar>
    )
}