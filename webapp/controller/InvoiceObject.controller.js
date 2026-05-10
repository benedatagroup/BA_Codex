sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "bacodex/model/formatter"
], function (Controller, formatter) {
    "use strict";

    return Controller.extend("bacodex.controller.InvoiceObject", {
        formatter: formatter,

        onInit: function () {
            this.getOwnerComponent().getRouter()
                .getRoute("RouteInvoiceObject")
                .attachPatternMatched(this._onObjectMatched, this);
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteInvoiceList");
        },

        _onObjectMatched: function (oEvent) {
            var sInvoiceId = decodeURIComponent(oEvent.getParameter("arguments").invoiceId),
                sPath = this.getOwnerComponent().getModel().createKey("/Invoices", {
                    InvoiceId: sInvoiceId
                });

            this.getView().bindElement({
                path: sPath,
                parameters: {
                    select: [
                        "InvoiceId",
                        "InvoiceNumber",
                        "VendorName",
                        "VendorId",
                        "InvoiceDate",
                        "DueDate",
                        "PostingDate",
                        "NetAmount",
                        "TaxAmount",
                        "GrossAmount",
                        "Currency",
                        "Status",
                        "PaymentTerms",
                        "CompanyCode"
                    ].join(",")
                }
            });
        }
    });
});
