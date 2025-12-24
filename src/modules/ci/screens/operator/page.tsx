import type { Operator } from "../../types/operator";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyIcon, MoreHorizontalIcon, PlusIcon, TrashIcon, Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { deleteOperator, getAllOperator } from "../../api";
import { Spinner } from "@/components/ui/spinner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CILayout } from "../../components/layout";

const columns: ColumnDef<Operator>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => {
            const [_, copy] = useCopyToClipboard()
            const id = row.getValue('id') as string;

            return (
                <div className='flex items-center gap-1'>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant='ghost' 
                                    size="icon" 
                                    className="h-8 w-8 text-muted-foreground hover:text-magenta-500"
                                    onClick={() => {
                                        toast.success('ID copiado');
                                        copy(id);
                                    }} 
                                >
                                    <CopyIcon className="h-3.5 w-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copiar ID</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <Link 
                        to={`/ci/operator/edit/${id}`} 
                        className='text-xs font-mono text-magenta-500 hover:underline max-w-[10ch] sm:max-w-[16ch] truncate'
                    >
                        {id}
                    </Link>
                </div>
            )
        }
    },
    {
        accessorKey: 'username',
        header: 'Usuário',
        cell: ({ row }) => (
            <div className='font-medium text-white truncate max-w-[12ch] sm:max-w-[20ch]'>
                {row.getValue('username')}
            </div>
        )
    },
    {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => (
            <div className='text-muted-foreground truncate max-w-[15ch] sm:max-w-[25ch]'>
                {row.getValue('email')}
            </div>
        )
    },
    {
        accessorKey: 'active',
        header: 'Status',
        cell: ({ row }) => (
            <Badge 
                variant={row.getValue('active') ? 'default' : 'destructive'}
                className="capitalize text-[10px] px-2 py-0"
            >
                {row.getValue('active') ? 'ativo' : 'inativo'}
            </Badge>
        )
    },
]

export function OperatorsPage() {
    const [rowSelection, setRowSelection] = useState({})
    const [filter, setFilter] = useState<string>('')

    const { data, isLoading, refetch } = useQuery({
        queryFn: getAllOperator,
        queryKey: ['lci', 'operators']
    })

    const filteredData = useMemo(() => data?.operators.filter(item => (
        item.id.toLowerCase().includes(filter.toLowerCase()) ||
        item.email.toLowerCase().includes(filter.toLowerCase()) ||
        item.username.toLowerCase().includes(filter.toLowerCase())
    )), [data, filter])

    const table = useReactTable({
        data: filteredData || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        onRowSelectionChange: setRowSelection,
        state: {
            rowSelection
        }
    })

    async function handleDelete() {
        if (!filteredData) return
        const selectedIndices = Object.keys(rowSelection).map(Number);
        
        for (const index of selectedIndices) {
            try {
                await deleteOperator(filteredData[index].id);
                toast.success(`Operador ${filteredData[index].username} removido`);
            } catch (error) {
                toast.error(`Erro ao deletar ${filteredData[index].username}`);
            }
        }
        setRowSelection({})
        refetch()
    }

    return (
        <CILayout>
            <div className="space-y-4 p-4 sm:p-6">
                {/* Toolbar Responsiva */}
                <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                    <div className="relative w-full sm:max-w-sm">
                        {/* <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /> */}
                        <Input
                            placeholder="Filtrar por nome, email ou ID..."
                            className='bg-white/5 border-white/10 focus-visible:ring-magenta-500 w-full'
                            value={filter}
                            onChange={event => setFilter(event.target.value)}
                        />
                    </div>
                    
                    <div className='flex items-center gap-2'>
                        <Link to='/ci/operator/create' className="flex-1 sm:flex-none">
                            <Button>
                                <PlusIcon/>
                                <span className="hidden sm:block">Novo operador</span>
                                <span className="block sm:hidden">Novo</span>
                            </Button>
                        </Link>
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button 
                                    variant='outline' 
                                    className="border-white/10"
                                    disabled={Object.keys(rowSelection).length === 0}
                                >
                                    <MoreHorizontalIcon className="h-4 w-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Ações</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-background border-white/10">
                                <DropdownMenuItem 
                                    onClick={handleDelete}
                                    className="text-red-400 focus:text-red-400 focus:bg-red-400/10 cursor-pointer"
                                >
                                    <TrashIcon className="mr-2 h-4 w-4" />
                                    Deletar
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Container da Tabela com scroll horizontal */}
                <div className="rounded-md border border-white/10 bg-white/[0.02] overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-white/5">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id} className="border-white/5 hover:bg-transparent">
                                        {headerGroup.headers.map(header => (
                                            <TableHead key={header.id} className="text-muted-foreground font-bold py-3">
                                                {header.isPlaceholder ? null : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className='h-32 text-center'>
                                            <div className='flex flex-col items-center justify-center gap-2 text-muted-foreground'>
                                                <Spinner className="text-magenta-500" />
                                                <span className="text-xs uppercase tracking-widest">Sincronizando...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map(row => (
                                        <TableRow
                                            key={row.id}
                                            data-state={row.getIsSelected() && "selected"}
                                            className="border-white/5 hover:bg-white/[0.03] data-[state=selected]:bg-magenta-500/10"
                                        >
                                            {row.getVisibleCells().map(cell => (
                                                <TableCell key={cell.id} className="py-3">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className='h-32 text-center text-muted-foreground'>
                                            Nenhum operador encontrado para "{filter}"
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
                
                {/* Contador de Seleção (Desktop) */}
                <div className="text-[10px] text-muted-foreground px-2">
                    {table.getFilteredSelectedRowModel().rows.length} de{" "}
                    {table.getFilteredRowModel().rows.length} operador(es) selecionado(s).
                </div>
            </div>
        </CILayout>
    )
}