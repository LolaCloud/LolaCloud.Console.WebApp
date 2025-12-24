import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { LogOutIcon, MoreVerticalIcon, UserIcon } from "lucide-react";
import { Kbd, KbdGroup } from "./ui/kbd";
import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { deleteAccessToken } from "@/modules/ci/utils";
import { useOperator } from "@/modules/ci/store/operator.store";
import { ProfileDialog } from "@/modules/ci/components/profile-dialog";

export function DefaultSidebarHeader() {
    return (
        <SidebarHeader>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        asChild
                        className='data-[slot=sidebar-menu-button]:!p-1.5'
                    >
                        <a href='#' className='flex items-center justify-between'>
                            <span className='text-base font-semibold'>
                                LolaCloud
                            </span>
                            <span>
                                <KbdGroup>
                                    <Kbd>Ctrl</Kbd>
                                    <span>+</span>
                                    <Kbd>K</Kbd>
                                </KbdGroup>
                            </span>
                        </a>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarHeader>
    )
}

export function DefaultSidebarFooter() {

    const { isMobile } = useSidebar();
    const { currentOperator } = useOperator()
    const [openProfileDialog, setOpenProfileDialog] = useState<boolean>(false)

    return (
        <SidebarFooter>
            <ProfileDialog isOpen={openProfileDialog} setIsOpen={setOpenProfileDialog}/>
            <SidebarMenu>
                <SidebarMenuItem>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuButton
                                size='lg'
                                className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
                            >
                                <Avatar className='h-8 w-8 rounded-lg'>
                                    <AvatarImage
                                        src='https://github.com/themiranha.png'
                                        alt='root'
                                    />
                                    <AvatarFallback className='rounded-lg'>RT</AvatarFallback>
                                </Avatar>
                                <div className='grid flex-1 text-left text-sm leading-tight'>
                                    <span className='truncate font-medium'>{currentOperator?.username}</span>
                                    <span className='text-muted-foreground truncate text-xs'>{currentOperator?.email}</span>
                                </div>
                                <MoreVerticalIcon className='ml-auto size-4' />
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
                            side={isMobile ? 'bottom' : 'right'}
                            align='end'
                            sideOffset={4}
                        >
                            <DropdownMenuLabel className='p-0 font-normal'>
                                <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                                    <Avatar className='h-8 w-8 rounded-lg'>
                                        <AvatarImage
                                            src='https://github.com/themiranha.png'
                                            alt={currentOperator?.username}
                                        />
                                        <AvatarFallback className='rounded-lg'>RT</AvatarFallback>
                                    </Avatar>
                                    <div className='grid flex-1 text-left text-sm leading-tight'>
                                        <span className='truncate font-medium'>{currentOperator?.username}</span>
                                        <span className='text-muted-foreground truncate text-xs'>{currentOperator?.email}</span>
                                    </div>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setOpenProfileDialog(true)}>
                                <UserIcon />
                                Conta
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => {
                                deleteAccessToken()
                                window.location.href = '/ci/sign-in'
                            }}>
                                <LogOutIcon />
                                Sair
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
    )
}

type DefaultSidebarContentProps = {
    groups: {
        items: { icon: ReactNode, label: string, pathChecker: (path: string) => boolean, url: string }[]
    }[]
}

export function DefaultSidebarContent({ groups }: DefaultSidebarContentProps) {

    const { pathname } = useLocation()

    return (
        <>
            <DefaultSidebarHeader />
            <SidebarContent>
                {
                    groups.map((group, groupIdx) => (
                        <SidebarGroup key={'sidebar-group-' + groupIdx}>
                            <SidebarGroupContent>
                                {
                                    group.items.map((item, itemIdx) => (
                                        <Link to={item.url}>
                                            <SidebarMenuButton
                                                key={'sidebar-group-' + groupIdx + '-item-' + itemIdx}
                                                className={
                                                    cn(
                                                        item.pathChecker(pathname) && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
                                                    )
                                                }
                                            >
                                                {
                                                    item.icon
                                                }
                                                {
                                                    item.label
                                                }
                                            </SidebarMenuButton></Link>
                                    ))
                                }
                            </SidebarGroupContent>
                        </SidebarGroup>
                    ))
                }
            </SidebarContent>
            <DefaultSidebarFooter />
        </>
    )
}

type DefaultSidebarProps = {
    children: ReactNode,
    header: ReactNode
} & DefaultSidebarContentProps

export function DefaultSidebar({ groups, children, header }: DefaultSidebarProps) {
    return (
        <SidebarProvider
            style={{
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)"
            } as React.CSSProperties}
        >
            <Sidebar variant="inset">
                <DefaultSidebarContent
                    groups={groups}
                />
            </Sidebar>
            <SidebarInset>
                {
                    header
                }
                <div className='overflow-hidden p-2 space-y-2'>
                    {
                        children
                    }
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}