import { Badge } from "@/components/ui/badge";
import { CILayout } from "../../components/layout";
import { Separator } from "@/components/ui/separator";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { 
  ShieldCheck, 
  Zap, 
  Terminal, 
  Globe, 
  LockIcon, 
  InfoIcon, 
  DatabaseIcon, 
  HardDriveIcon, 
  LayersIcon, 
  KeyIcon, 
  ShieldAlert, 
  IdCardLanyardIcon 
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function CIPage() {
    return (
        <CILayout>
            <div className="flex-1 space-y-6 sm:space-y-8 p-4 sm:p-8 pt-6 bg-background">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <IdCardLanyardIcon className="h-6 w-6 sm:h-8 sm:w-8 text-magenta-500" />
                            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                                Lola Core Identity <span className="text-magenta-500">(LCI)</span>
                            </h2>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                            O alicerce de segurança da LolaCloud. O LCI orquestra a identidade de operadores,
                            a validade de sessões e a autorização granular para todo o ecossistema PaaS.
                        </p>
                    </div>
                </div>

                <Separator className="bg-white/10" />

                {/* KPI Cards Grid */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-white/[0.02] border-white/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Motor de Acesso</CardTitle>
                            <ShieldCheck className="h-4 w-4 text-magenta-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl sm:text-2xl font-bold text-white">RBAC Ativo</div>
                            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1">Baseado em strings hierárquicas e wildcards.</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/[0.02] border-white/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Estado de Sessão</CardTitle>
                            <Zap className="h-4 w-4 text-magenta-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl sm:text-2xl font-bold text-white">Stateful JWT</div>
                            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1">Validação de SID em cada requisição ao BFF.</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/[0.02] border-white/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Privilégio</CardTitle>
                            <LockIcon className="h-4 w-4 text-magenta-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl sm:text-2xl font-bold text-white">Isolamento</div>
                            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1">Proteção contra escalada de privilégios.</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/[0.02] border-white/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Auditoria</CardTitle>
                            <Terminal className="h-4 w-4 text-magenta-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl sm:text-2xl font-bold text-white">Keeper Log</div>
                            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1">Rastreabilidade via ID de correlação.</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Grid */}
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
                    {/* Permissions Architecture Card */}
                    <div className="lg:col-span-8 space-y-6">
                        <Card className="bg-white/[0.02] border-white/10 overflow-hidden">
                            <div className="h-1 bg-magenta-500 w-full" />
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-white">
                                    <KeyIcon className="h-5 w-5 text-magenta-500" />
                                    Arquitetura de Permissões Granulares
                                </CardTitle>
                                <CardDescription className="text-sm">
                                    O LCI utiliza um sistema de autorização inspirado em políticas IAM modernas,
                                    permitindo controlo absoluto sobre cada recurso da infraestrutura.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Responsive Permission Box */}
                                <div className="relative group overflow-x-auto no-scrollbar">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-magenta-500/20 to-transparent rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                                    <div className="relative flex items-center justify-center rounded-md bg-black/40 p-4 sm:p-6 font-mono text-xs sm:text-sm md:text-lg lg:text-xl border border-white/10 tracking-tight sm:tracking-widest text-white shadow-2xl whitespace-nowrap min-w-fit">
                                        <span className="text-magenta-500">serviço</span>
                                        <span className="text-muted-foreground mx-0.5 sm:mx-1">::</span>
                                        <span className="text-magenta-300">recurso</span>
                                        <span className="text-muted-foreground mx-0.5 sm:mx-1">::</span>
                                        <span className="text-white">ação</span>
                                    </div>
                                </div>

                                {/* Permission Breakdowns */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-4">
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold uppercase text-magenta-500">1. Serviço</h4>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Define o módulo da LolaCloud (Ex: lci, lrt, ls, lr).
                                        </p>
                                    </div>
                                    <div className="space-y-2 md:border-l md:border-white/10 md:pl-4">
                                        <h4 className="text-xs font-bold uppercase text-magenta-300">2. Recurso</h4>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Entidade dentro do serviço (Ex: operator, database).
                                        </p>
                                    </div>
                                    <div className="space-y-2 md:border-l md:border-white/10 md:pl-4">
                                        <h4 className="text-xs font-bold uppercase text-white">3. Ação</h4>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Verbo (Ex: create, read, delete ou wildcard *).
                                        </p>
                                    </div>
                                </div>

                                <Alert className="bg-white/5 border-magenta-500/20">
                                    <ShieldAlert className="h-4 w-4 text-magenta-500" />
                                    <AlertTitle className="text-magenta-500 font-bold text-sm">Lógica de Wildcard</AlertTitle>
                                    <AlertDescription className="text-muted-foreground text-xs leading-relaxed">
                                        Permissões com <code className="text-white">*</code> permitem acesso dinâmico.
                                        Ex: <code className="text-white">ls::*</code> concede acesso total ao Lola Store.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>

                        {/* Integration Card */}
                        <Card className="bg-white/[0.02] border-white/10">
                            <CardHeader>
                                <CardTitle className="text-lg text-white">Integração entre Serviços</CardTitle>
                                <CardDescription className="text-sm">
                                    Como o LCI protege os outros módulos da plataforma.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4">
                                    {[
                                        { title: "Lola Relate (LRT)", desc: "Valida consola SQL e provisionamento de instâncias.", icon: DatabaseIcon },
                                        { title: "Lola Store (LS)", desc: "Controlo de Buckets S3 e prevenção de deleções.", icon: HardDriveIcon },
                                        { title: "Lola Stacker", desc: "Orquestração de infraestrutura declarativa.", icon: LayersIcon },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group">
                                            <div className="p-2 rounded bg-magenta-500/10 text-magenta-500 group-hover:scale-110 transition-transform shrink-0">
                                                <item.icon size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h5 className="text-sm font-semibold text-white truncate">{item.title}</h5>
                                                <p className="text-[11px] text-muted-foreground line-clamp-2 sm:line-clamp-none">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column (Security & Tips) */}
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="bg-white/[0.02] border-white/10 h-fit shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-white text-lg">
                                    <LockIcon className="h-5 w-5 text-magenta-500" />
                                    Segurança de Sessão
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-5">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 bg-magenta-500/20 p-1.5 rounded-md text-magenta-500 shrink-0">
                                            <Zap size={14} />
                                        </div>
                                        <div className="space-y-1">
                                            <h6 className="text-xs font-bold text-white uppercase tracking-wide">Stateful Validation</h6>
                                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                O LCI consulta o banco de dados em cada request para verificar revogações manuais de sessão.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 bg-magenta-500/20 p-1.5 rounded-md text-magenta-500 shrink-0">
                                            <Globe size={14} />
                                        </div>
                                        <div className="space-y-1">
                                            <h6 className="text-xs font-bold text-white uppercase tracking-wide">Device Fingerprinting</h6>
                                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                Sessões vinculadas ao IP e User-Agent. Mudanças bruscas de contexto invalidam o token.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <Separator className="bg-white/5" />

                                <div className="p-4 rounded-lg bg-magenta-500/5 border border-magenta-500/10 space-y-3">
                                    <div className="flex items-center gap-2 text-magenta-500">
                                        <InfoIcon size={14} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Dica de Segurança</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                                        "Atribua permissões seguindo o Princípio do Menor Privilégio. Wildcards devem ser usados com cautela."
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </CILayout>
    );
}