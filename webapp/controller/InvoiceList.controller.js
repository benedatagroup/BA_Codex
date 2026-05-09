sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "bacodex/model/formatter"
], function (Controller, Filter, FilterOperator, formatter) {
    "use strict";

    return Controller.extend("bacodex.controller.InvoiceList", {
        formatter: formatter,

        onInit: function () {
            this._oTable = this.byId("invoiceTable");
        },

        onSearch: function () {
            this._applyFilters();
        },

        onFilterChange: function () {
            this._applyFilters();
        },

        onClearFilters: function () {
            this.byId("searchField").setValue("");
            this.byId("statusFilter").setSelectedKey("All");
            this.byId("companyCodeFilter").setSelectedKey("All");
            this.byId("invoiceDateFilter").setValue("");
            this.byId("minGrossAmountFilter").setValue("");
            this._applyFilters();
        },

        onInvoicePress: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();

            if (!oContext) {
                return;
            }

            this.getOwnerComponent().getRouter().navTo("RouteInvoiceObject", {
                invoiceId: encodeURIComponent(oContext.getProperty("InvoiceId"))
            });
        },

        _applyFilters: function () {
            var aFilters = [],
                sQuery = this.byId("searchField").getValue(),
                sStatus = this.byId("statusFilter").getSelectedKey(),
                sCompanyCode = this.byId("companyCodeFilter").getSelectedKey(),
                oDateRange = this.byId("invoiceDateFilter"),
                oStartDate = oDateRange.getDateValue(),
                oEndDate = oDateRange.getSecondDateValue(),
                sMinGrossAmount = this.byId("minGrossAmountFilter").getValue(),
                fMinGrossAmount = Number(sMinGrossAmount),
                oBinding = this._oTable.getBinding("items");

            if (sQuery) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("InvoiceNumber", FilterOperator.Contains, sQuery),
                        new Filter("VendorName", FilterOperator.Contains, sQuery)
                    ],
                    and: false
                }));
            }

            if (sStatus && sStatus !== "All") {
                aFilters.push(new Filter("Status", FilterOperator.EQ, sStatus));
            }

            if (sCompanyCode && sCompanyCode !== "All") {
                aFilters.push(new Filter("CompanyCode", FilterOperator.EQ, sCompanyCode));
            }

            if (oStartDate) {
                aFilters.push(new Filter(
                    "InvoiceDate",
                    FilterOperator.BT,
                    this._atStartOfDay(oStartDate),
                    this._atEndOfDay(oEndDate || oStartDate)
                ));
            }

            if (sMinGrossAmount && !Number.isNaN(fMinGrossAmount)) {
                aFilters.push(new Filter("GrossAmount", FilterOperator.GE, fMinGrossAmount.toFixed(2)));
            }

            oBinding.filter(aFilters);
        },

        _atStartOfDay: function (oDate) {
            return new Date(oDate.getFullYear(), oDate.getMonth(), oDate.getDate(), 0, 0, 0, 0);
        },

        _atEndOfDay: function (oDate) {
            return new Date(oDate.getFullYear(), oDate.getMonth(), oDate.getDate(), 23, 59, 59, 999);
        }
    });
});
