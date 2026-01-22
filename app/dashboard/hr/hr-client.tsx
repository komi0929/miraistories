'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { Location, Staff, StaffInsert, Shift, ShiftInsert } from '@/types/database.types'
import { useState } from 'react'
import { Plus, Users, Calendar, Sparkles, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HRClientProps {
    initialStaff: Staff[]
    initialShifts: (Shift & {
        staff: { id: string; full_name: string; hourly_wage: number } | null
        locations: { id: string; name: string } | null
    })[]
    locations: Location[]
}

const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: 'AIドラフト', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    published: { label: '確定', color: 'bg-blue-100 text-blue-800' },
    completed: { label: '完了', color: 'bg-green-100 text-green-800' },
}

export function HRClient({ initialStaff, initialShifts, locations }: HRClientProps) {
    const [staff, setStaff] = useState<Staff[]>(initialStaff)
    const [shifts, setShifts] = useState(initialShifts)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [newStaff, setNewStaff] = useState<Partial<StaffInsert>>({
        full_name: '',
        hourly_wage: 1000,
        skills: [],
    })
    const [skillInput, setSkillInput] = useState('')
    const [isGeneratingShifts, setIsGeneratingShifts] = useState(false)

    const supabase = createClient()

    const handleCreateStaff = async () => {
        if (!newStaff.full_name) return

        const { data, error } = await (supabase.from('staff') as any)
            .insert({
                full_name: newStaff.full_name,
                hourly_wage: newStaff.hourly_wage || 1000,
                skills: newStaff.skills || [],
            })
            .select()
            .single() as { data: Staff | null, error: any }

        if (data) {
            setStaff([...staff, data])
            setNewStaff({ full_name: '', hourly_wage: 1000, skills: [] })
            setIsDialogOpen(false)
        }
    }

    const addSkill = () => {
        if (skillInput.trim()) {
            setNewStaff({
                ...newStaff,
                skills: [...(newStaff.skills || []), skillInput.trim()],
            })
            setSkillInput('')
        }
    }

    const handleGenerateAIShifts = async () => {
        setIsGeneratingShifts(true)
        // Simulate AI generation - in production this would call OpenAI API
        await new Promise(resolve => setTimeout(resolve, 1500))

        // Create draft shifts
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(9, 0, 0, 0)

        const endTime = new Date(tomorrow)
        endTime.setHours(17, 0, 0, 0)

        // Create a draft shift for the first staff member
        if (staff.length > 0 && locations.length > 0) {
            const { data, error } = await (supabase.from('shifts') as any)
                .insert({
                    staff_id: staff[0].id,
                    location_id: locations[0].id,
                    start_time: tomorrow.toISOString(),
                    end_time: endTime.toISOString(),
                    role_assigned: 'オーブン',
                    status: 'draft',
                })
                .select(`
                    *,
                    staff:staff_id (id, full_name, hourly_wage),
                    locations:location_id (id, name)
                `)
                .single()

            if (data) {
                // Manually cast or rely on shape if complex join
                setShifts([data as any, ...shifts])
            }
        }

        setIsGeneratingShifts(false)
    }

    // Count draft shifts
    const draftShiftCount = shifts.filter(s => s.status === 'draft').length

    // Calculate total labor cost
    const totalLaborCost = shifts.reduce((acc, shift) => {
        const hourlyWage = shift.staff?.hourly_wage || 0
        const start = new Date(shift.start_time)
        const end = new Date(shift.end_time)
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        return acc + (hourlyWage * hours)
    }, 0)

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                        <Users className="h-4 w-4" />
                        <span className="text-sm">従業員数</span>
                    </div>
                    <span className="text-2xl font-bold text-slate-900">
                        {staff.length}
                    </span>
                </div>
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">シフト数</span>
                    </div>
                    <span className="text-2xl font-bold text-slate-900">
                        {shifts.length}
                    </span>
                </div>
                <div className={cn(
                    "p-4 rounded-lg border shadow-sm",
                    draftShiftCount > 0 ? "bg-yellow-50 border-yellow-200" : "bg-white"
                )}>
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                        <Sparkles className={cn("h-4 w-4", draftShiftCount > 0 && "text-yellow-500")} />
                        <span className="text-sm">AIドラフト</span>
                    </div>
                    <span className={cn("text-2xl font-bold", draftShiftCount > 0 ? "text-yellow-600" : "text-slate-900")}>
                        {draftShiftCount}
                    </span>
                </div>
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">予定人件費</span>
                    </div>
                    <span className="text-2xl font-bold text-slate-900">
                        ¥{totalLaborCost.toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="shifts" className="w-full">
                <TabsList className="bg-white border">
                    <TabsTrigger value="shifts" className="gap-2">
                        <Calendar className="h-4 w-4" />
                        シフト管理
                    </TabsTrigger>
                    <TabsTrigger value="staff" className="gap-2">
                        <Users className="h-4 w-4" />
                        従業員マスタ
                    </TabsTrigger>
                </TabsList>

                {/* Shifts Tab */}
                <TabsContent value="shifts" className="mt-4">
                    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-semibold">シフト一覧</h3>
                            <Button
                                size="sm"
                                onClick={handleGenerateAIShifts}
                                disabled={isGeneratingShifts || staff.length === 0}
                            >
                                <Sparkles className="h-4 w-4 mr-2" />
                                {isGeneratingShifts ? '生成中...' : 'AI: シフト提案を生成'}
                            </Button>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead>従業員</TableHead>
                                    <TableHead>拠点</TableHead>
                                    <TableHead>開始時刻</TableHead>
                                    <TableHead>終了時刻</TableHead>
                                    <TableHead>役割</TableHead>
                                    <TableHead>ステータス</TableHead>
                                    <TableHead className="w-[100px]">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {shifts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                                            シフトがありません。AIで生成してみましょう。
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    shifts.map((shift) => {
                                        const statusInfo = statusLabels[shift.status]

                                        return (
                                            <TableRow
                                                key={shift.id}
                                                className={shift.status === 'draft' ? 'bg-yellow-50/50' : ''}
                                            >
                                                <TableCell className="font-medium">
                                                    {shift.staff?.full_name || '不明'}
                                                </TableCell>
                                                <TableCell>
                                                    {shift.locations?.name || '不明'}
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(shift.start_time).toLocaleString('ja-JP', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(shift.end_time).toLocaleString('ja-JP', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </TableCell>
                                                <TableCell>
                                                    {shift.role_assigned || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={cn(
                                                        statusInfo?.color,
                                                        shift.status === 'draft' && 'border'
                                                    )}>
                                                        {shift.status === 'draft' && (
                                                            <Sparkles className="h-3 w-3 mr-1" />
                                                        )}
                                                        {statusInfo?.label || shift.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {shift.status === 'draft' && (
                                                        <div className="flex gap-1">
                                                            <Button variant="outline" size="sm">
                                                                承認
                                                            </Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                {/* Staff Tab */}
                <TabsContent value="staff" className="mt-4">
                    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-semibold">従業員一覧</h3>
                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm">
                                        <Plus className="h-4 w-4 mr-2" />
                                        従業員を追加
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>新規従業員登録</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 pt-4">
                                        <div>
                                            <label className="text-sm font-medium text-slate-700">
                                                氏名
                                            </label>
                                            <Input
                                                placeholder="例: 山田 太郎"
                                                value={newStaff.full_name}
                                                onChange={(e) => setNewStaff({ ...newStaff, full_name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-700">
                                                時給 (円)
                                            </label>
                                            <Input
                                                type="number"
                                                placeholder="1000"
                                                value={newStaff.hourly_wage}
                                                onChange={(e) => setNewStaff({ ...newStaff, hourly_wage: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-700">
                                                スキル
                                            </label>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="例: オーブン"
                                                    value={skillInput}
                                                    onChange={(e) => setSkillInput(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                                                />
                                                <Button type="button" variant="outline" onClick={addSkill}>
                                                    追加
                                                </Button>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {newStaff.skills?.map((skill, i) => (
                                                    <Badge key={i} variant="secondary">
                                                        {skill}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-4">
                                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                                キャンセル
                                            </Button>
                                            <Button onClick={handleCreateStaff}>
                                                登録
                                            </Button>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead>氏名</TableHead>
                                    <TableHead className="text-right">時給</TableHead>
                                    <TableHead>スキル</TableHead>
                                    <TableHead className="w-[100px]">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staff.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                                            従業員が登録されていません
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    staff.map((member) => (
                                        <TableRow key={member.id}>
                                            <TableCell className="font-medium">
                                                {member.full_name}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                ¥{member.hourly_wage.toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {member.skills?.map((skill, i) => (
                                                        <Badge key={i} variant="outline" className="text-xs">
                                                            {skill}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="sm">
                                                    編集
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
