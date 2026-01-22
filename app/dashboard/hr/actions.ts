'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Dynamic import to avoid issues if API key is not set
async function getGeminiAI() {
    try {
        const { generateShiftRecommendations } = await import('@/lib/ai/gemini')
        return generateShiftRecommendations
    } catch {
        return null
    }
}

export async function generateAIShifts(date?: Date) {
    const supabase = await createClient()

    // 1. Fetch staff and locations
    const { data: staffData } = await (supabase
        .from('staff') as any)
        .select('id, full_name, skills, hourly_wage')

    const { data: locationsData } = await (supabase
        .from('locations') as any)
        .select('id, name')

    if (!staffData || staffData.length === 0) {
        return { success: false, message: 'スタッフデータがありません' }
    }

    if (!locationsData || locationsData.length === 0) {
        return { success: false, message: '拠点データがありません' }
    }

    const targetDate = date || new Date()
    targetDate.setDate(targetDate.getDate() + 1)
    targetDate.setHours(9, 0, 0, 0)

    // 2. Try to use Gemini AI
    const generateFn = await getGeminiAI()

    let shifts: { staffId: string; locationId: string; startTime: string; endTime: string; role: string }[]
    let aiReasoning = ''

    if (generateFn && process.env.GOOGLE_API_KEY) {
        try {
            const aiResult = await generateFn(
                (staffData as any[]).map((s: any) => ({
                    id: s.id,
                    name: s.full_name,
                    skills: s.skills || [],
                    hourlyWage: s.hourly_wage
                })),
                (locationsData as any[]).map((l: any) => ({ id: l.id, name: l.name })),
                targetDate
            )
            shifts = aiResult.shifts
            aiReasoning = aiResult.reasoning
        } catch (error) {
            console.error('Gemini AI error:', error)
            // Fallback to simple logic
            shifts = createFallbackShifts(staffData, locationsData, targetDate)
            aiReasoning = 'AIエラーのためシンプルなロジックで生成しました'
        }
    } else {
        // Fallback if no API key
        shifts = createFallbackShifts(staffData, locationsData, targetDate)
        aiReasoning = 'AI APIキー未設定のため、シンプルなロジックで生成しました'
    }

    // 3. Insert shifts into database
    const createdShifts = []
    for (const shift of shifts) {
        const startTime = new Date(targetDate)
        const [startHour, startMin] = shift.startTime.split(':').map(Number)
        startTime.setHours(startHour, startMin, 0, 0)

        const endTime = new Date(targetDate)
        const [endHour, endMin] = shift.endTime.split(':').map(Number)
        endTime.setHours(endHour, endMin, 0, 0)

        const { data, error } = await (supabase.from('shifts') as any)
            .insert({
                staff_id: shift.staffId,
                location_id: shift.locationId,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                role_assigned: shift.role,
                status: 'draft'
            })
            .select()
            .single()

        if (data) {
            createdShifts.push(data)
        }
    }

    revalidatePath('/dashboard/hr')
    return {
        success: true,
        message: `${createdShifts.length}件のAIシフトを生成しました`,
        reasoning: aiReasoning,
        count: createdShifts.length
    }
}

function createFallbackShifts(
    staff: { id: string; skills: string[] | null }[],
    locations: { id: string }[],
    date: Date
) {
    // Simple fallback: assign first 2 staff members
    return staff.slice(0, 2).map((s) => ({
        staffId: s.id,
        locationId: locations[0]?.id || '',
        startTime: '09:00',
        endTime: '18:00',
        role: s.skills?.[0] || 'オーブン'
    }))
}
