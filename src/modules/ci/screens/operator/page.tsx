import type { Operator } from "../../types/operator";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyIcon, MoreHorizontalIcon, PlusIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CILayout } from "../../components/layout";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { toast } from "sonner";

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

            return (
                <div className='flex items-center'>
                    <Button variant='link' onClick={() => {
                        toast.success('ID copiado', {
                            description: row.getValue('id'),
                        })
                        copy(row.getValue('id'))
                    }} >
                        <CopyIcon />
                    </Button>
                    <Button variant='link' className='p-0 flex items-center gap-2'>
                        <Link to={`/ci/operator/edit/${row.getValue('id')}`} className='max-w-[7ch] truncate'>
                            {row.getValue('id')}
                        </Link>
                    </Button>
                </div>
            )
        }
    },
    {
        accessorKey: 'username',
        header: 'Usuário',
        cell: ({ row }) => (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <div className='truncate max-w-[20ch]'>
                            {row.getValue('username')}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        {row.getValue('username')}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    },
    {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <div className='truncate max-w-[20ch]'>
                            {row.getValue('email')}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        {row.getValue('email')}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    },
    {
        accessorKey: 'active',
        header: 'Ativo',
        cell: ({ row }) => (
            <Badge variant={row.getValue('active') ? 'default' : 'destructive'}>
                {
                    row.getValue('active') ? 'ativo' : 'inativo'
                }
            </Badge>
        )
    },
]

export function OperatorsPage() {

    const [rowSelection, setRowSelection] = useState({})
    const [filter, setFilter] = useState<string>('')

    const data = useMemo(() => [{
        active: true,
        created_at: new Date(),
        email: 'lucas.miranda.strapasson@gmail.com',
        id: '6003a3e1-42ed-4e45-9b2c-05b44cf40772',
        updated_at: new Date(),
        username: 'root'
    }], [])

    const filteredData = useMemo(() => data.filter(item => (
        item.id.toLowerCase().includes(filter.toLowerCase()) ||
        item.email.toLowerCase().includes(filter.toLowerCase()) ||
        item.username.toLowerCase().includes(filter.toLowerCase())
    )), [data, filter])

    const table = useReactTable({
        data: filteredData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        onRowSelectionChange: setRowSelection,
        state: {
            rowSelection
        }
    })

    return (
        <CILayout>
            <div className='flex items-center justify-between'>
                <div>
                    <Input
                        placeholder="Pesquisar operadores..."
                        className='w-[350px]'
                        value={filter}
                        onChange={event => setFilter(event.target.value)}
                    />
                </div>
                <div className='flex items-center gap-2'>
                    <Link to='/ci/operator/create'>
                        <Button>
                            <PlusIcon />
                            Novo operador
                        </Button>
                    </Link>
                    <Button variant='outline' disabled={Object.keys(rowSelection).length == 0}>
                        <MoreHorizontalIcon />
                        Mais
                    </Button>
                </div>
            </div>
            <Table>
                <TableHeader>
                    {
                        table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {
                                    headerGroup.headers.map(header => (
                                        <TableHead key={header.id}>
                                            {
                                                header.isPlaceholder ? null : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )
                                            }
                                        </TableHead>
                                    ))
                                }
                            </TableRow>
                        ))
                    }
                </TableHeader>
                <TableBody>
                    {
                        table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map(row => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {
                                        row.getVisibleCells().map(cell => (
                                            <TableCell
                                                key={cell.id}
                                            >
                                                {
                                                    flexRender(cell.column.columnDef.cell, cell.getContext())
                                                }
                                            </TableCell>
                                        ))
                                    }
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length} className='h-24 text-center'
                                >
                                    Nenhum operador encontrado
                                </TableCell>
                            </TableRow>
                        )
                    }
                </TableBody>
            </Table>
        </CILayout>
    )
}