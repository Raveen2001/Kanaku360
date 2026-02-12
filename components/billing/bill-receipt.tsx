"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import type { Bill, Shop, BillItem } from "@/types";

interface BillReceiptProps {
  bill: Bill & { items: BillItem[] };
  shop: Shop;
  open: boolean;
  onClose: () => void;
}

export function BillReceipt({ bill, shop, open, onClose }: BillReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Invoice-${bill.bill_number}`,
    pageStyle: `
      @page {
        size: 80mm auto;
        margin: 0;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Bill #{bill.bill_number}</span>
            <Button size="sm" variant="outline" onClick={() => handlePrint()}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Printable Receipt */}
        <div
          ref={printRef}
          className="bg-white text-black p-4 font-mono text-xs"
          style={{ width: "80mm", margin: "0 auto" }}
        >
          {/* Header */}
          <div className="text-center mb-4">
            <h1 className="text-lg font-bold">{shop.name}</h1>
            {shop.name_tamil && <p className="text-sm">{shop.name_tamil}</p>}
            {shop.address && <p className="text-xs mt-1">{shop.address}</p>}
            {shop.phone && <p className="text-xs">Tel: {shop.phone}</p>}
            {shop.gstin && (
              <p className="text-xs font-semibold mt-1">GSTIN: {shop.gstin}</p>
            )}
          </div>

          <div className="border-t border-b border-dashed border-black py-2 my-2 text-center">
            <p className="font-bold">TAX INVOICE</p>
          </div>

          {/* Bill Info */}
          <div className="mb-3 text-xs">
            <div className="flex justify-between">
              <span>Bill No:</span>
              <span className="font-semibold">{bill.bill_number}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{formatDate(bill.created_at)}</span>
            </div>
            {bill.customer_name && (
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{bill.customer_name}</span>
              </div>
            )}
            {bill.customer_phone && (
              <div className="flex justify-between">
                <span>Phone:</span>
                <span>{bill.customer_phone}</span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-black my-2" />

          {/* Items Header */}
          <div className="flex text-xs font-bold mb-1">
            <span className="flex-1">Item</span>
            <span className="w-12 text-right">Qty</span>
            <span className="w-16 text-right">Rate</span>
            <span className="w-16 text-right">Amount</span>
          </div>

          <div className="border-t border-dashed border-black mb-2" />

          {/* Items */}
          <div className="space-y-2">
            {bill.items.map((item, index) => (
              <div key={item.id || index} className="text-xs">
                <div className="flex">
                  <span className="flex-1 break-words pr-1">
                    {item.product_name_tamil || item.product_name}
                  </span>
                  <span className="w-14 text-right whitespace-nowrap">
                    {item.quantity} {item.unit}
                  </span>
                  <span className="w-16 text-right">
                    {item.unit_price.toFixed(2)}
                  </span>
                  <span className="w-16 text-right font-semibold">
                    {(item.quantity * item.unit_price).toFixed(2)}
                  </span>
                </div>
                {item.gst_percent > 0 && (
                  <div className="text-[10px] text-gray-600 text-right">
                    GST @{item.gst_percent}%: ₹{item.gst_amount.toFixed(2)}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-black my-2" />

          {/* Totals */}
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(bill.subtotal)}</span>
            </div>
            {bill.discount_amount > 0 && (
              <div className="flex justify-between">
                <span>Discount ({bill.discount_percent}%):</span>
                <span>-{formatCurrency(bill.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Taxable Amount:</span>
              <span>{formatCurrency(bill.taxable_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST:</span>
              <span>{formatCurrency(bill.gst_amount)}</span>
            </div>
            <div className="border-t border-black my-1" />
            <div className="flex justify-between text-sm font-bold">
              <span>TOTAL:</span>
              <span>{formatCurrency(bill.total)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-black my-2" />

          {/* Payment Info */}
          <div className="text-xs mb-3">
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <span className="font-semibold uppercase">
                {bill.payment_method}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs mt-4 pt-2 border-t border-dashed border-black">
            <p className="font-semibold">Thank you for your purchase!</p>
            <p className="mt-1 text-[10px] text-gray-600">
              Please retain this bill for any returns or exchanges.
            </p>
            <p className="mt-2 text-[10px]">*** Powered by Kanaku360 ***</p>
          </div>

          {/* GST Summary */}
          {bill.gst_amount > 0 && shop.gstin && (
            <div className="mt-3 pt-2 border-t border-dashed border-black text-[10px]">
              <p className="font-semibold text-center mb-1">GST Summary</p>
              <div className="flex justify-between">
                <span>CGST:</span>
                <span>{formatCurrency(bill.gst_amount / 2)}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST:</span>
                <span>{formatCurrency(bill.gst_amount / 2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => handlePrint()}>
            <Printer className="w-4 h-4 mr-2" />
            Print Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
