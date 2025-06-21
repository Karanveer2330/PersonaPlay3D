"use client";

import { useState } from "react";
import dynamic from 'next/dynamic';
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import SidebarControls from "@/components/sidebar-controls";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const ThreeCanvas = dynamic(() => import('@/components/three-canvas'), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-muted animate-pulse" /> 
});


export default function VTubeMeet() {
  const [vrmUrl, setVrmUrl] = useState<string | null>(null);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <Sidebar collapsible="icon">
          <SidebarControls 
            onVrmUpload={setVrmUrl} 
            isCameraEnabled={isCameraEnabled}
            onToggleCamera={setIsCameraEnabled}
          />
        </Sidebar>
        <SidebarInset>
          <main className="relative h-full w-full">
            <ThreeCanvas vrmUrl={vrmUrl} isCameraEnabled={isCameraEnabled} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              {vrmUrl !== null && !isCameraEnabled && (
                 <Card className="max-w-md pointer-events-auto shadow-2xl animate-fade-in-up">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-foreground">Enable Your Camera</CardTitle>
                    <CardDescription>Activate your camera from the side panel to animate your avatar.</CardDescription>
                  </CardHeader>
                 </Card>
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
