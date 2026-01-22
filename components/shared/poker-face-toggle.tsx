'use client'

import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { usePokerFace } from '@/hooks/use-poker-face'
import { Eye, EyeOff } from 'lucide-react'

export function PokerFaceToggle() {
    const { isPokerFaceMode, togglePokerFaceMode } = usePokerFace()

    return (
        <div className="flex items-center space-x-2 border p-2 rounded-lg bg-background shadow-sm">
            <Switch
                id="poker-face-mode"
                checked={isPokerFaceMode}
                onCheckedChange={togglePokerFaceMode}
            />
            <Label htmlFor="poker-face-mode" className="cursor-pointer flex items-center gap-2 select-none">
                {isPokerFaceMode ? (
                    <>
                        <EyeOff className="h-4 w-4 text-primary" />
                        <span className="font-bold text-primary">Negotiation Mode ON</span>
                    </>
                ) : (
                    <>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Internal View</span>
                    </>
                )}
            </Label>
        </div>
    )
}
