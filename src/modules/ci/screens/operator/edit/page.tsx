import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getOperatorById, updateOperator } from "@/modules/ci/api";
import { CILayout } from "@/modules/ci/components/layout";
import { LolaPermissions } from "@/modules/ci/enums/permissions.enum";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import z from "zod";

const formSchema = z.object({
    username: z.string().min(3),
    email: z.email(),
    name: z.string()
})

export function EditOperatorPage() {

    const [permissions, setPermissions] = useState<LolaPermissions[]>([])

    const { operatorId } = useParams() as { operatorId: string }

    const { data } = useQuery({
        queryFn: () => getOperatorById(operatorId),
        queryKey: ['lci', 'operator', operatorId]
    })

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            username: '',
            name: ''
        }
    })

    useEffect(() => {
        if (data) {
            form.setValue('email', data.operator.email)
            form.setValue('name', data.operator.name)
            form.setValue('username', data.operator.username)
            data.operator.permissions.forEach(permission => {
                setPermissions(prev => [...prev, permission.slug])
            })
        }
    }, [data])

    async function handleSubmit(data: z.infer<typeof formSchema>) {
        await updateOperator(operatorId, { email: data.email, name: data.name, permissions: permissions })
        window.history.back()
    }

    const togglePermission = (permission: LolaPermissions) => {
        if (permissions.indexOf(permission) == -1) {
            setPermissions(prev => [...prev, permission])
        } else {
            setPermissions(prev => prev.filter(item => item != permission))
        }
    }

    const checkPermission = (permission: LolaPermissions) => {
        return permissions.some(p => p === permission)
    }

    return (
        <CILayout>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className='grid grid-cols-2 gap-2'>
                    <FormField
                        control={form.control}
                        name='username'
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Usuário</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder='usuário'
                                        disabled
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name='email'
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder='user@domain'
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {
                        data?.operator.username != 'root' && (
                            <div className='col-span-4 space-y-2'>
                                <Label>Permissões</Label>
                                <Accordion type="multiple">
                                    <AccordionItem disableBackground value='lci'>
                                        <AccordionTrigger>Lola Core Identity</AccordionTrigger>
                                        <AccordionContent className='[&>div]:flex [&>div]:items-center [&>div]:gap-2'>
                                            <div>
                                                <Checkbox checked={checkPermission(LolaPermissions.LCI_ALL)} onClick={() => {
                                                    togglePermission(LolaPermissions.LCI_ALL)
                                                }} /> *
                                                {/* lci::* */}
                                            </div>
                                            <Separator className='my-2' />
                                            <div>
                                                <Checkbox checked={checkPermission(LolaPermissions.LCI_OPERATOR_CREATE)} onClick={() => {
                                                    togglePermission(LolaPermissions.LCI_OPERATOR_CREATE)
                                                }} /> Criar operador
                                                {/* lci::operator::create */}
                                            </div>

                                            <div>
                                                <Checkbox checked={checkPermission(LolaPermissions.LCI_OPERATOR_UPDATE)} onClick={() => {
                                                    togglePermission(LolaPermissions.LCI_OPERATOR_UPDATE)
                                                }} /> Atualizar operador
                                                {/* lci::operator::update */}
                                            </div>
                                            <div>
                                                <Checkbox checked={checkPermission(LolaPermissions.LCI_OPERATOR_DELETE)} onClick={() => {
                                                    togglePermission(LolaPermissions.LCI_OPERATOR_DELETE)
                                                }} /> Deletar operador
                                                {/* lci::operator::delete */}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </div>
                        )
                    }
                    <div className='col-span-4 flex items-center justify-end gap-2'>
                        <Button type='button' variant='destructive' onClick={() => window.history.back()}>
                            Cancelar
                        </Button>
                        <Button type='submit'>
                            Salvar
                        </Button>
                    </div>
                </form>
            </Form>
        </CILayout>
    )
}