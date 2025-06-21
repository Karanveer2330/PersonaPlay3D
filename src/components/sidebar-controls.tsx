"use client";

import { ChangeEvent, useRef, useState } from "react";
import { SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Upload, Mic, MicOff, Video, VideoOff, Radio } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SidebarControlsProps {
  onVrmUpload: (url: string) => void;
  isCameraEnabled: boolean;
  onToggleCamera: (enabled: boolean) => void;
}

export default function SidebarControls({ onVrmUpload, isCameraEnabled, onToggleCamera }: SidebarControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.vrm')) {
      const url = URL.createObjectURL(file);
      onVrmUpload(url);
    } else if (file) {
      toast({
        title: "Invalid File",
        description: "Please select a .vrm file.",
        variant: "destructive",
      });
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <SidebarHeader className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
            <svg role="img" aria-label="VTube Meet logo" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-foreground" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2ZM8.5 15.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2Zm7 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2ZM12 9c.83 0 1.5.67 1.5 1.5S12.83 12 12 12s-1.5-.67-1.5-1.5S11.17 9 12 9Z"/>
            </svg>
            <span className="font-semibold text-lg text-foreground">VTube Meet</span>
        </div>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".vrm"
              className="hidden"
            />
            <SidebarMenuButton onClick={handleUploadClick} tooltip="Upload VRM Avatar">
              <Upload />
              <span>Upload Avatar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu className="mt-4">
          <SidebarMenuItem>
             <SidebarMenuButton onClick={() => onToggleCamera(!isCameraEnabled)} isActive={isCameraEnabled} tooltip={isCameraEnabled ? "Disable Camera" : "Enable Camera"}>
              {isCameraEnabled ? <Video /> : <VideoOff />}
              <span>{isCameraEnabled ? 'Camera On' : 'Camera Off'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setIsMuted(!isMuted)} tooltip={isMuted ? "Unmute" : "Mute"}>
              {isMuted ? <MicOff /> : <Mic />}
              <span>{isMuted ? 'Muted' : 'Mic On'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <SidebarMenuButton tooltip="Start Streaming">
              <Radio />
              <span>Go Live</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </>
  );
}
