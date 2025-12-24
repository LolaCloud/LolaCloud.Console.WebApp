import { Badge } from "@/components/ui/badge";
import { CILayout } from "../../components/layout";
import { Separator } from "@/components/ui/separator";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ShieldCheck, Zap, Terminal, Globe, LockIcon, InfoIcon, DatabaseIcon, HardDriveIcon, LayersIcon, KeyIcon, ShieldAlert, IdCardLanyardIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function CIPage() {
    return (
        <CILayout>
            <div className="flex-1 space-y-8 p-8 pt-6 bg-background">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <IdCardLanyardIcon className="h-8 w-8 text-magenta-500" />
                            <h2 className="text-3xl font-bold tracking-tight text-white">Lola Core Identity <span className="text-magenta-500">(LCI)</span></h2>
                        </div>
                        <p className="text-muted-foreground max-w-2xl">
                            O alicerce de segurança da LolaCloud. O LCI orquestra a identidade de operadores,
                            a validade de sessões e a autorização granular para todo o ecossistema PaaS.
                        </p>
                    </div>
                </div>

                <Separator className="bg-white/10" />

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-white/[0.02] border-white/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Motor de Acesso</CardTitle>
                            <ShieldCheck className="h-4 w-4 text-magenta-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">RBAC Ativo</div>
                            <p className="text-[11px] text-muted-foreground mt-1">Baseado em strings hierárquicas e wildcards.</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/[0.02] border-white/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Estado de Sessão</CardTitle>
                            <Zap className="h-4 w-4 text-magenta-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Stateful JWT</div>
                            <p className="text-[11px] text-muted-foreground mt-1">Validação de SID em cada requisição ao BFF.</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/[0.02] border-white/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Privilégio</CardTitle>
                            <LockIcon className="h-4 w-4 text-magenta-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Isolamento</div>
                            <p className="text-[11px] text-muted-foreground mt-1">Proteção contra escalada de privilégios não autorizada.</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/[0.02] border-white/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Auditoria</CardTitle>
                            <Terminal className="h-4 w-4 text-magenta-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Keeper Log</div>
                            <p className="text-[11px] text-muted-foreground mt-1">Rastreabilidade total via ID de correlação.</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-12">
                    <div className="lg:col-span-8 space-y-6">
                        <Card className="bg-white/[0.02] border-white/10 overflow-hidden">
                            <div className="h-1 bg-magenta-500 w-full" />
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <KeyIcon className="h-5 w-5 text-magenta-500" />
                                    Arquitetura de Permissões Granulares
                                </CardTitle>
                                <CardDescription>
                                    O LCI utiliza um sistema de autorização inspirado em políticas IAM modernas,
                                    permitindo controlo absoluto sobre cada recurso da infraestrutura.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-magenta-500/20 to-transparent rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                                    <div className="relative flex items-center justify-center rounded-md bg-black/40 p-6 font-mono text-xl border border-white/10 tracking-widest text-white shadow-2xl">
                                        <span className="text-magenta-500">serviço</span>
                                        <span className="text-muted-foreground mx-1">::</span>
                                        <span className="text-magenta-300">recurso</span>
                                        <span className="text-muted-foreground mx-1">::</span>
                                        <span>ação</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold uppercase text-magenta-500">1. Serviço</h4>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Define o módulo da LolaCloud que está a ser acedido (Ex: lci, lrt, ls, lr).
                                        </p>
                                    </div>
                                    <div className="space-y-2 border-l border-white/10 pl-4">
                                        <h4 className="text-xs font-bold uppercase text-magenta-300">2. Recurso</h4>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Identifica a entidade específica dentro do serviço (Ex: operator, database, bucket).
                                        </p>
                                    </div>
                                    <div className="space-y-2 border-l border-white/10 pl-4">
                                        <h4 className="text-xs font-bold uppercase text-white">3. Ação</h4>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Verbo que define a permissão (Ex: create, read, delete ou wildcard *).
                                        </p>
                                    </div>
                                </div>

                                <Alert className="bg-white/5 border-magenta-500/20">
                                    <ShieldAlert className="h-4 w-4 text-magenta-500" />
                                    <AlertTitle className="text-magenta-500 font-bold">Lógica de Wildcard</AlertTitle>
                                    <AlertDescription className="text-muted-foreground text-xs leading-relaxed">
                                        Permissões com <code className="text-white">*</code> permitem acesso dinâmico.
                                        Por exemplo, <code className="text-white">ls::*</code> concede acesso total ao Lola Store,
                                        incluindo buckets e objectos, sem precisar de listar cada ação individualmente.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>

                        <Card className="bg-white/[0.02] border-white/10">
                            <CardHeader>
                                <CardTitle className="text-lg">Integração entre Serviços</CardTitle>
                                <CardDescription>
                                    Como o LCI protege os outros módulos da plataforma.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group">
                                        <div className="p-2 rounded bg-magenta-500/10 text-magenta-500 group-hover:scale-110 transition-transform">
                                            <DatabaseIcon size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <h5 className="text-sm font-semibold">Lola Relate (LRT)</h5>
                                            <p className="text-xs text-muted-foreground">O LCI valida se o operador tem permissão de consola SQL ou de provisionar instâncias de DB.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group">
                                        <div className="p-2 rounded bg-magenta-500/10 text-magenta-500 group-hover:scale-110 transition-transform">
                                            <HardDriveIcon size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <h5 className="text-sm font-semibold">Lola Store (LS)</h5>
                                            <p className="text-xs text-muted-foreground">Controlo de Buckets S3. Impede deleções acidentais sem a permissão `ls::bucket::delete`.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group">
                                        <div className="p-2 rounded bg-magenta-500/10 text-magenta-500 group-hover:scale-110 transition-transform">
                                            <LayersIcon size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <h5 className="text-sm font-semibold">Lola Stacker</h5>
                                            <p className="text-xs text-muted-foreground">Garante que apenas operadores com permissão de infraestrutura podem orquestrar Stacks.</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <Card className="bg-white/[0.02] border-white/10 h-fit">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <LockIcon className="h-5 w-5 text-magenta-500" />
                                    Segurança de Sessão
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 bg-magenta-500/20 p-1 rounded">
                                            <Zap size={14} className="text-magenta-500" />
                                        </div>
                                        <div>
                                            <h6 className="text-xs font-bold text-white uppercase">Stateful Validation</h6>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Ao contrário do JWT tradicional, o LCI consulta o banco de dados em cada request para verificar se a sessão foi revogada manualmente.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 bg-magenta-500/20 p-1 rounded">
                                            <Globe size={14} className="text-magenta-500" />
                                        </div>
                                        <div>
                                            <h6 className="text-xs font-bold text-white uppercase">Device Fingerprinting</h6>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Sessões vinculadas ao endereço IP e User-Agent. Mudanças bruscas de contexto invalidam o token automaticamente.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <Separator className="bg-white/5" />

                                <div className="p-4 rounded-lg bg-black/20 border border-white/5 space-y-3">
                                    <div className="flex items-center gap-2 text-magenta-500">
                                        <InfoIcon size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Dica de Segurança</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                                        "Sempre que criar um novo Operador, atribua apenas as permissões necessárias para a sua função (Princípio do Menor Privilégio). Use o wildcard '*' apenas para contas administrativas de alto nível."
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </CILayout>
    )
}