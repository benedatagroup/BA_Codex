sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("bacodex.controller.InvoiceObject", {
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
                path: sPath
            });
        }
    });
});
