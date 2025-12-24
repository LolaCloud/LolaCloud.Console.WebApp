import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authenticate } from "../../api";
import { setAccessToken } from "../../utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const formSchema = z.object({
    username: z.string(),
    password: z.string()
})

export function SignInPage() {

    const navigate = useNavigate()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            password: '',
            username: ''
        }
    })

    async function onSubmit(data: z.infer<typeof formSchema>) {
        try {
            const response = await authenticate(data)
            setAccessToken(response.access_token)
            navigate('/ci')
        } catch (error) {
            toast.error('Credenciais inválidas')
        }
    }

    return (
        <div className='h-screen w-screen flex justify-center items-center'>
            <Card className='w-[350px]'>
                <CardHeader>
                    <CardTitle>Autenticação</CardTitle>
                    <CardDescription>
                        Insira seu usuário e senha para continuar.
                    </CardDescription>
                </CardHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
                        <CardContent className='space-y-4'>
                            <FormField
                                control={form.control}
                                name='username'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Usuário</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder='themiranha'
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Senha</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder='********'
                                                type='password'
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                        <CardFooter>
                            <Button className='w-full'>
                                Entrar
                            </Button>
                        </CardFooter>
                    </form>
                </Form>

            </Card>
        </div>
    )
}