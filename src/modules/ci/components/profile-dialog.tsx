import moment from 'moment';
import {
  Monitor,
  Smartphone,
  LogOut,
  Trash2,
  KeyRound,
  Zap,
  Lock, Globe,
  Clock,
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
import { useQuery } from '@tanstack/react-query';
import { useOperator } from '../store/operator.store';
import { disableOperatorSession, getOperatorSessions, updateOperatorPassword } from '../api';

const passwordSchema = z.object({
  newPassword: z.string().min(8, "A nova senha deve ter pelo menos 8 caracteres"),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export function ProfileDialog({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (e: boolean) => void }) {

  const { currentOperator } = useOperator()

  const { data: sessions, refetch } = useQuery({
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
    try {
      await updateOperatorPassword({
        newPassword: values.newPassword
      })
      toast.success("Senha alterada com sucesso!");
      form.reset();
    } catch (error) {
      toast.error("Erro ao atualizar senha");
    }
  }

  async function handleRevokeSession(id: string) {
    try {
      await disableOperatorSession(id)
      toast.info("Sessão revogada com sucesso.");
      refetch();
    } catch (error) {
      toast.error("Erro ao revogar sessão");
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[95vw] max-w-[600px] bg-background border-white/10 shadow-2xl p-4 sm:p-6 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2 text-magenta-500">
            <IdCardLanyardIcon className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Segurança de Conta</span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-white">Configurações de Operador</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            Gerencie sua identidade, altere sua senha e monitore seus acessos ativos.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="security" className="mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10 p-1">
            <TabsTrigger value="security" className="text-xs sm:text-sm data-[state=active]:bg-magenta-500 data-[state=active]:text-white">
              <Lock className="h-3.5 w-3.5 mr-2" /> Segurança
            </TabsTrigger>
            <TabsTrigger value="sessions" className="text-xs sm:text-sm data-[state=active]:bg-magenta-500 data-[state=active]:text-white">
              <Zap className="h-3.5 w-3.5 mr-2" /> Sessões
            </TabsTrigger>
          </TabsList>

          <TabsContent value="security" className="space-y-4 pt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitPassword)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/70 text-xs">Nova Senha</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} className="bg-white/5 border-white/10 focus-visible:ring-magenta-500 h-9" />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/70 text-xs">Confirmar Nova Senha</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} className="bg-white/5 border-white/10 focus-visible:ring-magenta-500 h-9" />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full bg-magenta-500 hover:bg-magenta-600 text-white font-bold h-10 transition-all">
                  <KeyRound className="h-4 w-4 mr-2" /> Atualizar Senha
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4 pt-4">
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
              {sessions?.sessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border transition-all gap-3 ${session.current ? 'bg-magenta-500/5 border-magenta-500/30' : 'bg-white/5 border-white/10'
                    }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 bg-black/40 rounded-md border border-white/10 text-magenta-500 shrink-0">
                      {session.device_type === 'Mobile' ? <Smartphone size={18} /> : <Monitor size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px]">
                          {session.user_agent}
                        </span>
                        {session.current && <Badge className="bg-magenta-500 text-[8px] h-3.5 px-1 uppercase leading-none">Atual</Badge>}
                      </div>

                      {/* Metadados com suporte a quebra de linha para IPv6 */}
                      <div className="text-[10px] text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                        <div className="flex items-center gap-1">
                          <Globe size={10} className="text-magenta-500/50" />
                          <span className="font-mono break-all text-white/60 bg-white/5 px-1 rounded">
                            {session.ip_address}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={10} className="text-magenta-500/50" />
                          <span>{moment(session.updated_at).format('DD/MM/YYYY HH:mm')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {!session.current && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 self-end sm:self-center h-8 px-2"
                      onClick={() => handleRevokeSession(session.id)}
                    >
                      <Trash2 size={14} className="mr-2 sm:mr-0" />
                      <span className="sm:hidden text-[10px] font-bold">Encerrar Sessão</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Separator className="bg-white/5" />

            <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg text-[10px] text-red-400/80 flex gap-2 items-start leading-relaxed">
              <LogOut size={12} className="mt-0.5 shrink-0" />
              <span>Sair de outras sessões desconectará todos os seus dispositivos ativos, exceto este acesso atual.</span>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}