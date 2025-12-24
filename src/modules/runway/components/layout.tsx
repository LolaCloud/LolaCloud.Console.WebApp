import type { ReactNode } from "react";
import { DefaultSidebar } from "@/components/default-sidebar";
import { GlobeIcon, MilestoneIcon } from "lucide-react";
import { RunwayHeader } from "./header";

export function RunwayLayout(
    {
        children
    }: {
        children: ReactNode
    }
) {
    return (
        <DefaultSidebar
            header={<RunwayHeader />}
            groups={[{
                items: [
                    {
                        icon: <MilestoneIcon />,
                        label: 'Runway',
                        pathChecker: p => p === '/runway',
                        url: '/runway'
                    },
                    {
                        icon: <GlobeIcon />,
                        label: 'Zonas',
                        pathChecker: p => p.startsWith('/runway/zone'),
                        url: '/runway/zone'
                    },
                ]
            }]}
        >
            {children}
        </DefaultSidebar>
    )
}