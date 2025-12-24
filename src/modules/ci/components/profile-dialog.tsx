import { useState } from 'react';
import moment from 'moment'
import {
  Monitor,
  Smartphone,
  LogOut,
  Trash2,
  KeyRound, ZapIcon,
  LockIcon,
  IdCardLanyardIcon
} from 'lucide-react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { disableOperatorSession, getOperatorSessions, updateOperatorPassword } from '../api';
import { useQuery } from '@tanstack/react-query';
import { useOperator } from '../store/operator.store';

// Validação para troca de senha
const passwordSchema = z.object({
  newPassword: z.string().min(8, "A nova senha deve ter pelo menos 8 caracteres"),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export function ProfileDialog({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (e: boolean) => void }) {
  
  const { currentOperator } = useOperator()

  const {data: sessions, refetch} = useQuery({
    queryFn: getOperatorSessions,
    queryKey: ['lci', 'sessions', currentOperator?.id],
    enabled: currentOperator != null
  })

  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmitPassword(values: z.infer<typeof passwordSchema>) {
    await updateOperatorPassword({
      newPassword: values.newPassword
    })
    toast.success("Senha alterada com sucesso!");
    form.reset();
  }

  async function handleRevokeSession(id: string) {
    await disableOperatorSession(id)
    toast.info("Sessão revogada com sucesso.");
    refetch();
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] bg-background border-white/10 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <IdCardLanyardIcon />
            <span className="text-xs font-bold uppercase tracking-widest">Segurança de Conta</span>
          </div>
          <DialogTitle className="text-2xl font-bold text-white">Configurações de Operador</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Gerencie sua identidade, altere sua senha e monitore seus acessos ativos.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="security" className="mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10">
            <TabsTrigger value="security" className="data-[state=active]:bg-magenta-500 data-[state=active]:text-white">
              <LockIcon className="h-4 w-4 mr-2" /> Segurança
            </TabsTrigger>
            <TabsTrigger value="sessions" className="data-[state=active]:bg-magenta-500 data-[state=active]:text-white">
              <ZapIcon className="h-4 w-4 mr-2" /> Sessões Ativas
            </TabsTrigger>
          </TabsList>

          {/* Aba de Segurança / Alterar Senha */}
          <TabsContent value="security" className="space-y-4 pt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitPassword)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/70">Nova Senha</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} className="bg-white/5 border-white/10 focus-visible:ring-magenta-500" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/70">Confirmar Nova Senha</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} className="bg-white/5 border-white/10 focus-visible:ring-magenta-500" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full bg-magenta-500 hover:bg-magenta-600 text-white font-bold">
                  <KeyRound className="h-4 w-4 mr-2" /> Atualizar Senha
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* Aba de Sessões */}
          <TabsContent value="sessions" className="space-y-4 pt-4">
            <div className="space-y-3 max-h-[300px] overflow-y-scroll">
              {sessions?.sessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${session.current ? 'bg-magenta-500/5 border-magenta-500/30' : 'bg-white/5 border-white/10'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-black/40 rounded-md border border-white/10 text-magenta-500">
                      {session.device_type === 'Mobile' ? <Smartphone size={18} /> : <Monitor size={18} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{session.user_agent}</span>
                        {session.current && <Badge className="bg-magenta-500 text-[9px] h-4 uppercase">Atual</Badge>}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex gap-2">
                        <span>IP: {session.ip_address}</span>
                        <span>•</span>
                        <span>{session.location}</span>
                        <span>•</span>
                        <span>{moment(session.updated_at).format('dd/MM/YYYY HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                  {!session.current && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                      onClick={() => handleRevokeSession(session.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Separator className="bg-white/5" />
            <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-[11px] text-red-400 flex gap-2 items-start">
              <LogOut size={14} className="mt-0.5 shrink-0" />
              <span>Sair de todas as outras sessões desconectará todos os dispositivos, exceto este navegador atual.</span>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}