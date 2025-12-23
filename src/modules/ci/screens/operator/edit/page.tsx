import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CILayout } from "@/modules/ci/components/layout";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import z from "zod";

const formSchema = z.object({
    username: z.string().min(3),
    email: z.email(),
})

export function EditOperatorPage() {

    const { operatorId } = useParams() as {operatorId: string}

    console.log(operatorId)

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            username: ''
        }
    })

    async function handleSubmit(data: z.infer<typeof formSchema>) {
        console.log(data)
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
                    <div className='col-span-4 space-y-2'>
                        <Label>Permissões</Label>
                        <Accordion type="multiple">
                            <AccordionItem disableBackground value='lci'>
                                <AccordionTrigger>Lola Core Identity</AccordionTrigger>
                                <AccordionContent className='[&>div]:flex [&>div]:items-center [&>div]:gap-2'>
                                    <div>
                                        <Checkbox /> *
                                        {/* lci::* */}
                                    </div>
                                    <Separator className='my-2' />
                                    <div>
                                        <Checkbox /> Criar operador 
                                        {/* lci::operator::create */}
                                    </div>

                                    <div>
                                        <Checkbox /> Atualizar operador
                                        {/* lci::operator::update */}
                                    </div>
                                    <div>
                                        <Checkbox /> Deletar operador
                                        {/* lci::operator::delete */}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem disableBackground value='ls'>
                                <AccordionTrigger>Lola Store</AccordionTrigger>
                                <AccordionContent className='[&>div]:flex [&>div]:items-center [&>div]:gap-2'>
                                    <div>
                                        <Checkbox /> *
                                        {/* ls::* */}
                                    </div>
                                    <Separator className='my-2' />
                                    <div>
                                        <Checkbox /> Criar bucket
                                        {/* ls::bucket::create */}
                                    </div>
                                    <div>
                                        <Checkbox /> Deletar bucket
                                        {/* ls::bucket::delete */}
                                    </div>
                                    <div>
                                        <Checkbox /> Atualizar bucket
                                        {/* ls::bucket:update */}
                                    </div>
                                    <Separator className='my-2' />
                                    <div>
                                        <Checkbox /> Subir arquivos
                                        {/* ls::object::create */}
                                    </div>
                                    <div>
                                        <Checkbox /> Deletar arquivos
                                        {/* ls::object::delete */}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem disableBackground value='lr'>
                                <AccordionTrigger>Lola Relate</AccordionTrigger>
                                <AccordionContent className='[&>div]:flex [&>div]:items-center [&>div]:gap-2'>
                                    <div>
                                        <Checkbox /> *
                                        {/* lr::* */}
                                    </div>
                                    <Separator className='my-2' />
                                    <div>
                                        <Checkbox /> Criar instância
                                        {/* lr::instance::create */}
                                    </div>
                                    <div>
                                        <Checkbox /> Atualizar instância
                                        {/* lr::instance:update */}
                                    </div>
                                    <div>
                                        <Checkbox /> Deletar instância
                                        {/* lr::instance::delete */}
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