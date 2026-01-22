'use client'

import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Database } from '@/types/database.types'

type Asset = Database['public']['Tables']['assets']['Row']
type DecisionRow = Database['public']['Tables']['scenario_asset_decisions']['Row']

interface AssetTableProps {
    assets: Asset[]
    decisions: Map<string, string> // asset_id -> decision
    onDecisionChange: (assetId: string, decision: 'buy' | 'lease' | 'return') => void
    readOnly?: boolean
}

export function AssetTable({ assets, decisions, onDecisionChange, readOnly }: AssetTableProps) {
    return (
        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Asset Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Ask Price</TableHead>
                        <TableHead className="text-right">Lease/Mo</TableHead>
                        <TableHead className="text-center">Decision</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {assets.map((asset) => {
                        const decision = decisions.get(asset.id) || 'buy' // default to buy in UI?
                        return (
                            <TableRow key={asset.id}>
                                <TableCell className="font-medium">{asset.name}</TableCell>
                                <TableCell>{asset.category}</TableCell>
                                <TableCell className="text-right">¥{asset.ask_price.toLocaleString()}</TableCell>
                                <TableCell className="text-right">¥{asset.lease_monthly_cost.toLocaleString()}</TableCell>
                                <TableCell className="text-center">
                                    <div className="flex justify-center space-x-1">
                                        <Button
                                            variant={decision === 'buy' ? 'default' : 'outline'}
                                            size="sm"
                                            disabled={readOnly}
                                            onClick={() => onDecisionChange(asset.id, 'buy')}
                                            className="w-16"
                                        >
                                            BUY
                                        </Button>
                                        <Button
                                            variant={decision === 'lease' ? 'default' : 'outline'}
                                            size="sm"
                                            disabled={readOnly}
                                            onClick={() => onDecisionChange(asset.id, 'lease')}
                                            className="w-16 bg-blue-600 hover:bg-blue-700 data-[state=inactive]:bg-transparent"
                                        >
                                            LEASE
                                        </Button>
                                        <Button
                                            variant={decision === 'return' ? 'destructive' : 'outline'}
                                            size="sm"
                                            disabled={readOnly}
                                            onClick={() => onDecisionChange(asset.id, 'return')}
                                            className="w-16"
                                        >
                                            RETURN
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}
