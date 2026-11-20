export type InventoryBalance={stock_on_hand:number;reserved:number;reorder_point:number};

export function availableInventory(item:Pick<InventoryBalance,'stock_on_hand'|'reserved'>):number {
 return item.stock_on_hand-item.reserved;
}
export type InventoryState='out'|'low'|'ok';
export function inventoryState(item:InventoryBalance):InventoryState {
 const available=availableInventory(item);
 if(available<=0)return 'out';
 if(item.reorder_point>0 && available<=item.reorder_point)return 'low';
 return 'ok';
}
export function inventorySummary<T extends InventoryBalance>(items:T[]) {
 return {
  visible:items.length,
  out:items.filter(v=>inventoryState(v)==='out').length,
  low:items.filter(v=>inventoryState(v)==='low').length
 };
}
