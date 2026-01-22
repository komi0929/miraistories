'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function generateReplenishmentDrafts(locationId?: string) {
    const supabase = await createClient()

    // 1. Fetch all inventory lots to aggregate
    const { data: inventoryLotsRaw } = await supabase
        .from('inventory_lots')
        .select(`
            product_id,
            quantity,
            expiration_date,
            products:product_id (id, name, standard_cost, safety_stock, lot_size),
            locations:location_id (id, name)
        `)
        // Filter by scenario if needed, currently assumes real data (null scenario)
        .is('scenario_id', null)

    const inventoryLots = inventoryLotsRaw as any[]

    if (!inventoryLots || inventoryLots.length === 0) {
        return { success: false, message: '在庫データがありません' }
    }

    // 2. Aggregate Inventory by Product
    const productInventory = new Map<string, {
        totalQuantity: number,
        product: any,
        expiringSoonQuantity: number
    }>()

    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

    for (const lot of inventoryLots) {
        const productId = lot.product_id
        const current = productInventory.get(productId) || {
            totalQuantity: 0,
            product: lot.products,
            expiringSoonQuantity: 0
        }

        current.totalQuantity += lot.quantity

        // Check expiration
        if (lot.expiration_date) {
            const expiry = new Date(lot.expiration_date)
            if (expiry <= sevenDaysFromNow) {
                current.expiringSoonQuantity += lot.quantity
            }
        }

        productInventory.set(productId, current)
    }

    // 3. Identify items to reorder based on Safety Stock
    const itemsToReorder = new Map<string, {
        productId: string,
        productName: string,
        cost: number,
        quantityNeeded: number,
        reason: string
    }>()

    for (const [productId, data] of productInventory.entries()) {
        const product = data.product
        // Default safe values if column missing (though we added them)
        const safetyStock = product.safety_stock || 0
        const lotSize = product.lot_size || 100

        // Effective stock: subtract expiring items? 
        // For this logic: Total Quantity < Safety Stock => Reorder
        // OR if many items are expiring, maybe we should alert?
        // Let's stick to simple "Total < Safety" first.

        // Optional: If expiring soon items make up most of the stock, we might want to reorder.
        // Let's use: (Total - Expiring) < Safety Stock
        const effectiveStock = data.totalQuantity - data.expiringSoonQuantity

        if (effectiveStock < safetyStock) {
            const reasonParts = []
            if (data.totalQuantity < safetyStock) {
                reasonParts.push(`在庫不足 (現在: ${data.totalQuantity} < 安全在庫: ${safetyStock})`)
            } else if (effectiveStock < safetyStock) {
                reasonParts.push(`有効在庫不足 (期限切迫: ${data.expiringSoonQuantity})`)
            }

            itemsToReorder.set(productId, {
                productId: product.id,
                productName: product.name,
                cost: product.standard_cost,
                quantityNeeded: lotSize, // Order 1 lot
                reason: reasonParts.join('・')
            })
        }
    }

    if (itemsToReorder.size === 0) {
        return { success: true, message: '発注推奨アイテムはありませんでした (すべて安全在庫以上)' }
    }

    // 4. Create Draft PO
    const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
            supplier_name: 'AI推奨発注 (安全在庫補充)',
            status: 'draft',
            notes: 'AI在庫分析による自動提案: ' + Array.from(itemsToReorder.values()).map(i => i.productName).join(', '),
            total_amount: 0
        } as any)
        .select()
        .single()

    if (poError || !poData) {
        console.error("PO Creation Failed", poError)
        return { success: false, message: '発注書の作成に失敗しました' }
    }

    const po = poData as any


    // 5. Create Lines
    let totalAmount = 0
    const poLines = []

    for (const item of itemsToReorder.values()) {
        const lineTotal = item.quantityNeeded * item.cost
        totalAmount += lineTotal

        poLines.push({
            purchase_order_id: po.id,
            product_id: item.productId,
            quantity: item.quantityNeeded,
            unit_price: item.cost
        })
    }

    const { error: linesError } = await (supabase
        .from('purchase_order_lines') as any)
        .insert(poLines)

    if (linesError) {
        console.error("PO Lines Creation Failed", linesError)
        return { success: false, message: '明細の作成に失敗しました' }
    }

    // 6. Update Total
    await (supabase
        .from('purchase_orders') as any)
        .update({ total_amount: totalAmount })
        .eq('id', po.id)

    revalidatePath('/dashboard/supply-chain')
    return {
        success: true,
        message: `${itemsToReorder.size}件の補充提案を作成しました`,
        poId: po.id
    }
}
