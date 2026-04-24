import { useState } from "react";
import alaresLogo from "@/assets/alares-logo.png";
import { CadastroForm } from "@/components/lab/CadastroForm";
import { EntradaLabForm } from "@/components/lab/EntradaLabForm";
import { KanbanBoard } from "@/components/lab/KanbanBoard";
import { Dashboard } from "@/components/lab/Dashboard";
import { useLabItems } from "@/hooks/useLabItems";
import { useCadastroModelos } from "@/hooks/useCadastroModelos";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Kanban, Package, LogIn, LogOut,
  ClipboardCheck, ClipboardList, BarChart3, ChevronDown, ChevronRight,
  Settings, Briefcase, Monitor, AlertTriangle, Menu, X, Wrench, Users,
  Sun, Moon, Search,
} from "lucide-react";
import { ConsultaGeral } from "@/components/lab/ConsultaGeral";
import { TesteForm } from "@/components/lab/TesteForm";
import { InventarioLab } from "@/components/lab/InventarioLab";
import { VisualizacaoTestes } from "@/components/lab/VisualizacaoTestes";
import { LaudoAlerts } from "@/components/lab/LaudoAlerts";
import { RetornoReparo } from "@/components/lab/RetornoReparo";
import { ProdutividadeEquipe } from "@/components/lab/ProdutividadeEquipe";
import { GestaoUsuarios } from "@/components/lab/GestaoUsuarios";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";
import AccessDenied from "@/pages/AccessDenied";
import { WelcomeModal } from "@/components/lab/WelcomeModal";
import { useUserProfile } from "@/hooks/useUserProfile";

// Tabs restricted per role
const ADMIN_ONLY_TABS = ["cadastro", "usuarios"]; // only admin
const SUPERVISOR_RESTRICTED = ["cadastro", "usuarios"]; // supervisor can't access cadastro/usuarios
const OPERADOR_RESTRICTED = ["cadastro", "usuarios", "produtividade"]; // operador can't access produtividade, cadastro, usuarios

interface NavSection {
  label: string;
  icon: React.ReactNode;
  items: { value: string; label: string; icon: React.ReactNode }[];
}

const sections: NavSection[] = [
  {
    label: "Painel de Controle",
    icon: <Monitor className="h-4 w-4" />,
    items: [
      { value: "dashboard", label: "Visão Geral", icon: <LayoutDashboard className="h-4 w-4" /> },
      { value: "pipeline", label: "Fluxo de Trabalho", icon: <Kanban className="h-4 w-4" /> },
    ],
  },
  {
    label: "Operação",
    icon: <Briefcase className="h-4 w-4" />,
    items: [
      { value: "entrada", label: "Entrada", icon: <LogIn className="h-4 w-4" /> },
      { value: "teste", label: "Teste", icon: <ClipboardCheck className="h-4 w-4" /> },
      { value: "retorno", label: "Retorno de Reparo", icon: <Wrench className="h-4 w-4" /> },
      { value: "inventario", label: "Relatorio de Entrada", icon: <ClipboardList className="h-4 w-4" /> },
      { value: "visualizacao", label: "Relatorio de Teste", icon: <BarChart3 className="h-4 w-4" /> },
      { value: "laudo", label: "Laudo", icon: <AlertTriangle className="h-4 w-4" /> },
      { value: "consulta", label: "Consulta Geral", icon: <Search className="h-4 w-4" /> },
      { value: "produtividade", label: "Produtividade", icon: <Users className="h-4 w-4" /> },
    ],
  },
  {
    label: "Administração",
    icon: <Settings className="h-4 w-4" />,
    items: [
      { value: "cadastro", label: "Cadastro", icon: <Package className="h-4 w-4" /> },
      { value: "usuarios", label: "Usuários", icon: <Users className="h-4 w-4" /> },
    ],
  },
];

const roleBadgeColor: Record<string, string> = {
  admin: "bg-red-500/20 text-red-300 border-red-400/30",
  supervisor: "bg-amber-500/20 text-amber-300 border-amber-400/30",
  operador: "bg-sky-500/20 text-sky-200 border-sky-400/30",
};

export default function Index() {
  const { items, addItem, addBatch, deleteItem, isBatchLoading } = useLabItems();
  const { modelos, addModelo, addBatchModelos, deleteModelo } = useCadastroModelos();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { role } = useUserRole();
  const { displayName, email } = useUserProfile();
  const [tab, setTab] = useState("dashboard");
  const [pipelineFilter, setPipelineFilter] = useState<string | undefined>(undefined);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "Painel de Controle": true,
    "Operação": true,
    "Administração": true,
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSection = (label: string) => {
    setOpenSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const handleDashboardCardClick = (columnKey: string) => {
    setPipelineFilter(columnKey);
    setTab("pipeline");
  };

  const isRestricted = (tabValue: string) => {
    if (role === "admin") return false;
    if (role === "supervisor") return SUPERVISOR_RESTRICTED.includes(tabValue);
    // operador or no role
    return OPERADOR_RESTRICTED.includes(tabValue);
  };

  const renderContent = () => {
    if (isRestricted(tab)) {
      return <AccessDenied onGoBack={() => setTab("dashboard")} />;
    }
    switch (tab) {
      case "dashboard": return <Dashboard items={items} onCardClick={handleDashboardCardClick} />;
      case "pipeline": return <KanbanBoard items={items} onDelete={deleteItem} initialFilter={pipelineFilter} isAdmin={role === "admin"} onNavigateToLaudo={() => setTab("laudo")} />;
      case "cadastro": return <CadastroForm modelos={modelos} onAdd={addModelo} onAddBatch={addBatchModelos} onDelete={deleteModelo} isAdmin={role === "admin"} />;
      case "entrada": return <EntradaLabForm onAdd={addItem} onImportBatch={addBatch} isBatchLoading={isBatchLoading} />;
      case "teste": return <TesteForm labItems={items} isAdmin={role === "admin"} />;
      case "retorno": return <RetornoReparo labItems={items} />;
      case "inventario": return <InventarioLab items={items} userRole={role} />;
      case "visualizacao": return <VisualizacaoTestes userRole={role} />;
      case "laudo": return <LaudoAlerts items={items} isAdmin={role === "admin"} />;
      case "consulta": return <ConsultaGeral />;
      case "produtividade": return <ProdutividadeEquipe />;
      case "usuarios": return <GestaoUsuarios />;
      default: return <Dashboard items={items} />;
    }
  };

  const currentPage = sections.flatMap(s => s.items).find(i => i.value === tab);

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, var(--brand-from) 0%, var(--brand-to) 100%)" }}>
      {/* Sidebar — frosted glass over gradient */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex flex-col transition-all duration-300 ease-in-out",
          "backdrop-blur-2xl bg-[hsl(var(--sidebar-background))]/85 text-[hsl(var(--sidebar-foreground))] border-r border-white/10",
          "dark:bg-gradient-to-b dark:from-[hsl(225,60%,16%)] dark:to-[hsl(225,55%,10%)] dark:backdrop-blur-2xl",
          sidebarOpen ? "w-60" : "w-0 overflow-hidden"
        )}
      >
        {/* Brand — fade-in + slide-down animation */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          <button
            onClick={() => setTab("dashboard")}
            className="flex items-center gap-3 min-w-0 hover:opacity-90 transition-opacity animate-[fade-in_0.5s_ease-out]"
          >
            <img
              src={alaresLogo}
              alt="Alares Lab"
              className="h-10 w-10 rounded-lg shrink-0 object-contain drop-shadow-lg"
            />
            <div className="min-w-0">
              <span className="font-bold text-sm text-white tracking-tight block">Alares Lab</span>
              <span className="text-[10px] text-white/45 leading-none font-light tracking-wide">Criado por Mateus Mendes</span>
            </div>
          </button>
          <button
            onClick={toggleTheme}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200 shrink-0"
            title={theme === "dark" ? "Modo Claro" : "Modo Escuro"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {sections.map((section, idx) => (
            <div key={section.label} className={cn(idx > 0 && "mt-4")}>
              <button
                onClick={() => toggleSection(section.label)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40 hover:text-white/70 transition-colors"
              >
                {openSections[section.label] ? (
                  <ChevronDown className="h-3 w-3 opacity-50" />
                ) : (
                  <ChevronRight className="h-3 w-3 opacity-50" />
                )}
                <span>{section.label}</span>
              </button>
              {openSections[section.label] && (
                <div className="mt-0.5 space-y-0.5">
                  {section.items
                    .filter((item) => !isRestricted(item.value))
                    .map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setTab(item.value)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-200 ease-in-out",
                        tab === item.value
                          ? "bg-white/18 text-white font-medium shadow-sm dark:bg-[hsl(225,78%,55%)]/25 dark:text-white dark:shadow-[0_0_12px_hsl(225,78%,55%,0.15)]"
                          : "hover:bg-white/10 text-white/65 hover:text-white/90"
                      )}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* User profile + Logout */}
        <div className="border-t border-white/10 p-3 space-y-2">
          <div className="px-2 py-1.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-7 w-7 rounded-full bg-white/15 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white font-medium truncate leading-tight">{displayName}</p>
                <p className="text-[10px] text-white/40 truncate leading-tight">{email}</p>
                {role && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "mt-0.5 text-[9px] px-1.5 py-0 h-4 font-bold uppercase tracking-wider border",
                      roleBadgeColor[role] || "bg-white/10 text-white/60 border-white/20"
                    )}
                  >
                    {role}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="w-full justify-start gap-2 text-white/50 hover:text-white hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      {/* Main content area with card-like white/graphite background */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out",
        sidebarOpen ? "ml-60" : "ml-0"
      )}>
        <header className="h-16 border-b border-white/10 bg-card/90 backdrop-blur-md sticky top-0 z-20 flex items-center px-4 gap-3 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          <div className="flex items-center gap-2">
            {currentPage?.icon && <span className="text-primary">{currentPage.icon}</span>}
            <h1 className="text-base font-semibold tracking-tight">
              {currentPage?.label || "Visão Geral"}
            </h1>
          </div>
        </header>

        <main className="flex-1 p-5 md:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto bg-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-border/50 dark:border-[hsl(226,25%,22%)]/60 min-h-[calc(100vh-8rem)]">
            <ErrorBoundary>
              {renderContent()}
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* First-login welcome modal */}
      {user?.id && <WelcomeModal userId={user.id} userName={displayName} />}
    </div>
  );
}
