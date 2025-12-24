import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createOperator } from "@/modules/ci/api";
import { CILayout } from "@/modules/ci/components/layout";
import { LolaPermissions } from "@/modules/ci/enums/permissions.enum";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

const formSchema = z.object({
    username: z.string().min(3),
    email: z.string().max(0).or(z.email()),
    password: z.string().min(8),
    name: z.string()
})

export function CreateOperatorPage() {

    const [permissions, setPermissions] = useState<LolaPermissions[]>([])

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            password: '',
            username: '',
            name: ''
        }
    })

    async function handleSubmit(data: z.infer<typeof formSchema>) {
        try {
            await createOperator({
                name: data.name,
                password: data.password,
                permissions: permissions,
                username: data.username,
                email: data.email
            })
            window.history.back()
        } catch (error) {
            toast.error('Erro ao criar operador')
        }
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
                <form onSubmit={form.handleSubmit(handleSubmit)} className='grid grid-cols-4 gap-2'>
                    <FormField
                        control={form.control}
                        name='username'
                        render={({ field }) => (
                            <FormItem className='col-span-2'>
                                <FormLabel>Usuário</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder='usuário'
                                        {...field}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name='password'
                        render={({ field }) => (
                            <FormItem className='col-span-2'>
                                <FormLabel>Senha</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder='********'
                                        type='password'
                                        {...field}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name='name'
                        render={({ field }) => (
                            <FormItem className='col-span-2'>
                                <FormLabel>Nome</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder='nome'
                                        {...field}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name='email'
                        render={({ field }) => (
                            <FormItem className='col-span-2'>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder='user@domain'
                                        {...field}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
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
                    <div className='col-span-4 flex items-center justify-end gap-2'>
                        <Button type='button' variant='destructive' onClick={() => window.history.back()}>
                            Cancelar
                        </Button>
                        <Button type='submit'>
                            Criar
                        </Button>
                    </div>
                </form>
            </Form>
        </CILayout>
    )
}