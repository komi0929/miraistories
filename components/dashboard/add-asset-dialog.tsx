'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Database, AssetInsert } from '@/types/database.types'
import { useState } from 'react'

type Asset = Database['public']['Tables']['assets']['Row']

interface AddAssetDialogProps {
    onAssetAdded: (asset: Asset) => void
}

export function AddAssetDialog({ onAssetAdded }: AddAssetDialogProps) {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState('')
    const [category, setCategory] = useState('')
    const [askPrice, setAskPrice] = useState('')
    const [leaseCost, setLeaseCost] = useState('')
    const [loading, setLoading] = useState(false)

    const supabase = createClient()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        const { data, error } = await (supabase.from('assets') as any).insert({
            name,
            category,
            ask_price: Number(askPrice),
            lease_monthly_cost: Number(leaseCost),
        }).select().single() as { data: Asset | null, error: any }

        if (data) {
            onAssetAdded(data as Asset)
            setOpen(false)
            setName('')
            setCategory('')
            setAskPrice('')
            setLeaseCost('')
        } else {
            console.error(error)
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">Add Asset</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Asset</DialogTitle>
                    <DialogDescription>
                        Manually add an asset to the inventory.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="category" className="text-right">Category</Label>
                            <Input id="category" value={category} onChange={e => setCategory(e.target.value)} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="price" className="text-right">Ask Price</Label>
                            <Input id="price" type="number" value={askPrice} onChange={e => setAskPrice(e.target.value)} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="lease" className="text-right">Lease/Mo</Label>
                            <Input id="lease" type="number" value={leaseCost} onChange={e => setLeaseCost(e.target.value)} className="col-span-3" required />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Asset'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
