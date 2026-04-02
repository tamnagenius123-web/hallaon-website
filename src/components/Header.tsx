import React from 'react';
import { 
  ChevronRight, Star, MoreHorizontal, 
  Home, BarChart2, ListTodo, LayoutDashboard, Calendar as CalendarIcon,
  ClipboardList, Scale, BookOpen, HardDrive
} from 'lucide-react';
import { cn } from '../lib/utils';

interface HeaderProps {
  activeTab: string;
  presenceUsers: any[];
  onRefresh?: () => void;
}

const TAB_CONFIG: Record<string, { label: string, icon: any }> = {
  home: { label: '홈 · 가이드', icon: Home },
  dashboard: { label: '대시보드', icon: BarChart2 },
  tasks: { label: '업무 및 WBS', icon: ListTodo },
  gantt: { label: '간트 차트', icon: LayoutDashboard },
  calendar: { label: '캘린더', icon: CalendarIcon },
  agendas: { label: '안건', icon: ClipboardList },
  decisions: { label: '의사결정', icon: Scale },
  docs: { label: '문서 허브', icon: BookOpen },
  drive: { label: '자료실', icon: HardDrive },
};

export const Header = ({ activeTab, presenceUsers }: HeaderProps) => {
  const currentTab = TAB_CONFIG[activeTab] || { label: 'Workspace', icon: Home };
  const [isFavorited, setIsFavorited] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem('hallaon_favorites');
    if (stored) {
      const favs = new Set(JSON.parse(stored));
      setIsFavorited(favs.has(activeTab));
    }
  }, [activeTab]);

  const toggleFavorite = () => {
    const stored = localStorage.getItem('hallaon_favorites');
    const favs = new Set(stored ? JSON.parse(stored) : []);
    if (favs.has(activeTab)) {
      favs.delete(activeTab);
    } else {
      favs.add(activeTab);
    }
    localStorage.setItem('hallaon_favorites', JSON.stringify(Array.from(favs)));
    setIsFavorited(!isFavorited);
  };

  return (
    <header className="flex items-center justify-between h-11 px-3 md:px-4 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30 select-none">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-1 overflow-hidden">
        <div className="hidden md:flex items-center gap-1 px-1.5 py-1 rounded hover:bg-[var(--notion-hover)] cursor-pointer text-muted-foreground transition-colors shrink-0">
          <span className="text-sm font-medium">HALLAON</span>
        </div>
        <ChevronRight size={14} className="text-muted-foreground/40 shrink-0 hidden md:block" />
        <div className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-[var(--notion-hover)] cursor-pointer transition-colors overflow-hidden">
          <currentTab.icon size={15} className="text-muted-foreground shrink-0" />
          <span className="text-sm font-semibold truncate">{currentTab.label}</span>
        </div>
      </div>

      {/* Right: Actions & Presence */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Presence Users */}
        {presenceUsers.length > 0 && (
          <div className="flex -space-x-1.5 items-center">
            {presenceUsers.slice(0, 3).map((u, i) => (
              <div 
                key={i} 
                className="w-6 h-6 rounded-full border-2 border-background bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold uppercase"
                title={u.email}
              >
                {u.email?.[0] || 'U'}
              </div>
            ))}
            {presenceUsers.length > 3 && (
              <div className="w-6 h-6 rounded-full border-2 border-background bg-secondary text-muted-foreground flex items-center justify-center text-[9px] font-bold">
                +{presenceUsers.length - 3}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-0.5">
          <button 
            onClick={toggleFavorite}
            className="p-1.5 hover:bg-[var(--notion-hover)] rounded-md text-muted-foreground transition-colors" 
            title="즐겨찾기"
          >
            <Star size={16} className={cn("transition-colors", isFavorited && "fill-yellow-400 text-yellow-400")} />
          </button>
          <div className="w-[1px] h-4 bg-border mx-1" />
          <button className="p-1.5 hover:bg-[var(--notion-hover)] rounded-md text-muted-foreground transition-colors">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
