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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { Location, Product, ProductInsert } from '@/types/database.types'
import { useState } from 'react'
import { Plus, Package, Layers, Box } from 'lucide-react'

interface ProductionClientProps {
    initialProducts: Product[]
    initialLocations: Location[]
}

const productTypeLabels: Record<string, { label: string; icon: React.ElementType }> = {
    raw_material: { label: '原材料', icon: Package },
    intermediate: { label: '中間品', icon: Layers },
    product: { label: '製品', icon: Box },
}

export function ProductionClient({ initialProducts, initialLocations }: ProductionClientProps) {
    const [products, setProducts] = useState<Product[]>(initialProducts)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [newProduct, setNewProduct] = useState<Partial<ProductInsert>>({
        name: '',
        type: 'product',
        unit: 'pcs',
        standard_cost: 0,
    })
    const [filterType, setFilterType] = useState<string>('all')

    const supabase = createClient()

    const handleCreateProduct = async () => {
        if (!newProduct.name) return

        const { data, error } = await (supabase.from('products') as any)
            .insert({
                name: newProduct.name,
                type: newProduct.type,
                unit: newProduct.unit || 'pcs',
                standard_cost: newProduct.standard_cost || 0,
            })
            .select()
            .single() as { data: Product | null, error: any }

        if (data) {
            setProducts([data, ...products])
            setNewProduct({ name: '', type: 'product', unit: 'pcs', standard_cost: 0 })
            setIsDialogOpen(false)
        }
    }

    const filteredProducts = filterType === 'all'
        ? products
        : products.filter(p => p.type === filterType)

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-4">
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="種類でフィルタ" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">すべて</SelectItem>
                            <SelectItem value="raw_material">原材料</SelectItem>
                            <SelectItem value="intermediate">中間品</SelectItem>
                            <SelectItem value="product">製品</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            商品を追加
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>新規商品登録</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700">
                                    商品名
                                </label>
                                <Input
                                    placeholder="例: イチゴショート"
                                    value={newProduct.name}
                                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700">
                                    種類
                                </label>
                                <Select
                                    value={newProduct.type || 'product'}
                                    onValueChange={(v) => setNewProduct({ ...newProduct, type: v as 'raw_material' | 'intermediate' | 'product' })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="raw_material">原材料</SelectItem>
                                        <SelectItem value="intermediate">中間品</SelectItem>
                                        <SelectItem value="product">製品</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-700">
                                        単位
                                    </label>
                                    <Input
                                        placeholder="例: g, kg, pcs"
                                        value={newProduct.unit}
                                        onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700">
                                        標準原価 (円)
                                    </label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={newProduct.standard_cost}
                                        onChange={(e) => setNewProduct({ ...newProduct, standard_cost: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    キャンセル
                                </Button>
                                <Button onClick={handleCreateProduct}>
                                    登録
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50">
                            <TableHead className="w-[50px]">種類</TableHead>
                            <TableHead>商品名</TableHead>
                            <TableHead>単位</TableHead>
                            <TableHead className="text-right">標準原価</TableHead>
                            <TableHead className="w-[100px]">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredProducts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                    商品が登録されていません
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredProducts.map((product) => {
                                const typeInfo = productTypeLabels[product.type || 'product']
                                const Icon = typeInfo?.icon || Box

                                return (
                                    <TableRow key={product.id}>
                                        <TableCell>
                                            <div className="flex items-center justify-center">
                                                <Icon className="h-4 w-4 text-slate-500" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell>{product.unit}</TableCell>
                                        <TableCell className="text-right">
                                            ¥{product.standard_cost?.toLocaleString() || 0}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm">
                                                編集
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                        <Package className="h-4 w-4" />
                        <span className="text-sm">原材料</span>
                    </div>
                    <span className="text-2xl font-bold text-slate-900">
                        {products.filter(p => p.type === 'raw_material').length}
                    </span>
                </div>
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                        <Layers className="h-4 w-4" />
                        <span className="text-sm">中間品</span>
                    </div>
                    <span className="text-2xl font-bold text-slate-900">
                        {products.filter(p => p.type === 'intermediate').length}
                    </span>
                </div>
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                        <Box className="h-4 w-4" />
                        <span className="text-sm">製品</span>
                    </div>
                    <span className="text-2xl font-bold text-slate-900">
                        {products.filter(p => p.type === 'product').length}
                    </span>
                </div>
            </div>
        </div>
    )
}
