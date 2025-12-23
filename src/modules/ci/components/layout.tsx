import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { CIHeader } from "./header";
import { CISidebar } from "./sidebar";
import type { ReactNode } from "react";

export function CILayout(
    {
        children
    }: {
        children: ReactNode
    }
) {
    return (
        <SidebarProvider
            style={{
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)"
            } as React.CSSProperties}
        >
            <CISidebar />
            <SidebarInset>
                <CIHeader />
                <div className='overflow-hidden p-2 space-y-2'>
                    {
                        children
                    }
                </div>
            </SidebarInset>
        </SidebarProvider>

    )
}