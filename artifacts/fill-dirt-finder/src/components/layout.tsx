import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Truck, Map as MapIcon, Calculator, Settings, Edit3, Menu, FileText, UserCheck } from "lucide-react";
import { User } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/contexts/current-user";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { currentUser, setCurrentUser } = useCurrentUser();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-md">
              <Truck className="w-5 h-5" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-lg tracking-tight">Smith Trucking</span>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Quote Tool</span>
            </div>
            <div className="hidden sm:flex ml-4 px-2 py-0.5 bg-accent/20 text-accent-foreground border border-accent/30 rounded text-[10px] font-bold tracking-widest uppercase items-center">
              Pricing parity v1
            </div>
          </div>

          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
              <Link href="/" className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                location === "/" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}>
                <Calculator className="w-4 h-4" />
                <span>Calculator</span>
              </Link>
              <Link href="/quotes" className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                location === "/quotes"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}>
                <FileText className="w-4 h-4" />
                <span>Quote Log</span>
              </Link>
              <Link href="/pits" className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                location === "/pits" || location === "/pits/new" || /^\/pits\/[^/]+\/edit$/.test(location)
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}>
                <MapIcon className="w-4 h-4" />
                <span>Pits & Pricing</span>
              </Link>
              <Link href="/pits/bulk" className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                location === "/pits/bulk" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}>
                <Edit3 className="w-4 h-4" />
                <span>Bulk Update</span>
              </Link>
              <Link href="/settings" className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                location === "/settings" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}>
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Link>
            </nav>

            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center w-8 h-8 rounded-md bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                    <Menu className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/" className="flex items-center gap-2 w-full cursor-pointer">
                      <Calculator className="w-4 h-4" /> Calculator
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/quotes" className="flex items-center gap-2 w-full cursor-pointer">
                      <FileText className="w-4 h-4" /> Quote Log
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/pits" className="flex items-center gap-2 w-full cursor-pointer">
                      <MapIcon className="w-4 h-4" /> Pits & Pricing
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/pits/bulk" className="flex items-center gap-2 w-full cursor-pointer">
                      <Edit3 className="w-4 h-4" /> Bulk Update
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center gap-2 w-full cursor-pointer">
                      <Settings className="w-4 h-4" /> Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors font-bold text-sm">
                  {currentUser.charAt(0)}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5" /> {currentUser}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setCurrentUser(User.Alex)}
                  className={cn("cursor-pointer gap-2", currentUser === User.Alex && "font-semibold")}
                >
                  <span className="w-5 h-5 rounded-full bg-muted border flex items-center justify-center text-xs font-bold">A</span>
                  Alex — Operations
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setCurrentUser(User.Justin)}
                  className={cn("cursor-pointer gap-2", currentUser === User.Justin && "font-semibold")}
                >
                  <span className="w-5 h-5 rounded-full bg-muted border flex items-center justify-center text-xs font-bold">J</span>
                  Justin — Sales
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative">
        {children}
      </main>
    </div>
  );
}
