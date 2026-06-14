sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "bacodex/model/formatter"
], function (Controller, Fragment, JSONModel, Filter, FilterOperator, MessageBox, MessageToast, formatter) {
    "use strict";

    return Controller.extend("bacodex.controller.InvoiceList", {
        formatter: formatter,

        onInit: function () {
            this._oTable = this.byId("invoiceTable");
            this.getView().setModel(new JSONModel({
                busy: false,
                data: this._getInitialCreateData(),
                valueState: this._getInitialCreateValueState()
            }), "createInvoice");
            this.getView().setModel(new JSONModel({
                months: []
            }), "invoiceChart");
            this._configureInvoiceChart();
            this._loadInvoiceChartData();
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

        onCreateInvoice: function () {
            var oView = this.getView(),
                oCreateModel = oView.getModel("createInvoice");

            oCreateModel.setProperty("/data", this._getInitialCreateData());
            oCreateModel.setProperty("/valueState", this._getInitialCreateValueState());
            oCreateModel.setProperty("/busy", false);

            if (!this._pCreateDialog) {
                this._pCreateDialog = Fragment.load({
                    id: oView.getId(),
                    name: "bacodex.view.InvoiceCreateDialog",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._pCreateDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        onSaveNewInvoice: function () {
            var oView = this.getView(),
                oCreateModel = oView.getModel("createInvoice"),
                oData = oCreateModel.getProperty("/data"),
                oParsedData = this._validateCreateData(oData),
                oModel = this._getInvoiceModel();

            if (!oParsedData.valid) {
                MessageBox.error(this._getText("invoiceValidationError"));
                return;
            }

            if (!oModel) {
                MessageBox.error(this._getText("invoiceCreateError"));
                return;
            }

            oCreateModel.setProperty("/busy", true);

            oModel.create("/Invoices", this._createInvoicePayload(oParsedData), {
                success: function () {
                    MessageToast.show(this._getText("invoiceCreateSuccess"));
                    this._closeCreateDialog();
                    oCreateModel.setProperty("/busy", false);
                    oModel.refresh(true);
                    this._loadInvoiceChartData();
                }.bind(this),
                error: function () {
                    MessageBox.error(this._getText("invoiceCreateError"));
                    oCreateModel.setProperty("/busy", false);
                }.bind(this)
            });
        },

        onCancelNewInvoice: function () {
            this._closeCreateDialog();
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

        _configureInvoiceChart: function () {
            var oChart = this.byId("invoiceMonthChart");

            if (!oChart) {
                return;
            }

            oChart.setVizProperties({
                title: {
                    visible: false
                },
                legend: {
                    visible: false
                },
                plotArea: {
                    dataLabel: {
                        visible: true
                    }
                },
                categoryAxis: {
                    title: {
                        visible: true,
                        text: this._getText("invoiceChartMonth")
                    }
                },
                valueAxis: {
                    title: {
                        visible: true,
                        text: this._getText("invoiceChartCount")
                    }
                }
            });
        },

        _loadInvoiceChartData: function () {
            var oModel = this._getInvoiceModel();

            if (!oModel) {
                this.getView().getModel("invoiceChart").setProperty("/months", []);
                return;
            }

            oModel.read("/Invoices", {
                urlParameters: {
                    "$select": "InvoiceDate"
                },
                success: function (oData) {
                    this.getView().getModel("invoiceChart").setProperty(
                        "/months",
                        this._buildInvoiceChartData(oData.results || [])
                    );
                }.bind(this),
                error: function () {
                    this.getView().getModel("invoiceChart").setProperty("/months", []);
                }.bind(this)
            });
        },

        _getInvoiceModel: function () {
            return this.getView().getModel() || this.getOwnerComponent().getModel();
        },

        _buildInvoiceChartData: function (aInvoices) {
            var oMonthCounts = {};

            aInvoices.forEach(function (oInvoice) {
                var oDate = this._parseInvoiceDate(oInvoice.InvoiceDate),
                    sMonthKey;

                if (!oDate) {
                    return;
                }

                sMonthKey = String(oDate.getFullYear()) + "-" + String(oDate.getMonth() + 1).padStart(2, "0");
                oMonthCounts[sMonthKey] = (oMonthCounts[sMonthKey] || 0) + 1;
            }.bind(this));

            return Object.keys(oMonthCounts).sort().map(function (sMonthKey) {
                return {
                    Month: this._formatChartMonth(sMonthKey),
                    Count: oMonthCounts[sMonthKey]
                };
            }.bind(this));
        },

        _parseInvoiceDate: function (vDate) {
            var aDateParts,
                iTimestamp,
                oDate;

            if (vDate instanceof Date && !isNaN(vDate.getTime())) {
                return vDate;
            }

            if (typeof vDate === "string") {
                aDateParts = /\/Date\((-?\d+)\)\//.exec(vDate);
                iTimestamp = aDateParts ? Number(aDateParts[1]) : Date.parse(vDate);
                oDate = new Date(iTimestamp);

                if (!isNaN(oDate.getTime())) {
                    return oDate;
                }
            }

            return null;
        },

        _formatChartMonth: function (sMonthKey) {
            var aParts = sMonthKey.split("-"),
                oDate = new Date(Number(aParts[0]), Number(aParts[1]) - 1, 1);

            return oDate.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short"
            });
        },

        _validateCreateData: function (oData) {
            var oValueState = this._getInitialCreateValueState(),
                bValid = true,
                oInvoiceDate = oData.InvoiceDate,
                oDueDate = oData.DueDate;

            if (!oData.InvoiceNumber || !oData.InvoiceNumber.trim()) {
                oValueState.InvoiceNumber = "Error";
                bValid = false;
            }

            if (!oData.VendorName || !oData.VendorName.trim()) {
                oValueState.VendorName = "Error";
                bValid = false;
            }

            if (!(oInvoiceDate instanceof Date) || isNaN(oInvoiceDate.getTime())) {
                oValueState.InvoiceDate = "Error";
                bValid = false;
            }

            if (!oData.Currency || !oData.Currency.trim()) {
                oValueState.Currency = "Error";
                bValid = false;
            }

            if (oDueDate && (!(oDueDate instanceof Date) || isNaN(oDueDate.getTime()))) {
                oValueState.DueDate = "Error";
                bValid = false;
            }

            this.getView().getModel("createInvoice").setProperty("/valueState", oValueState);

            return {
                valid: bValid,
                InvoiceNumber: bValid ? oData.InvoiceNumber.trim() : "",
                VendorName: bValid ? oData.VendorName.trim() : "",
                InvoiceDate: bValid ? this._copyDate(oInvoiceDate) : null,
                DueDate: bValid && oDueDate ? this._copyDate(oDueDate) : null,
                Currency: bValid ? oData.Currency.trim().toUpperCase() : ""
            };
        },

        _createInvoicePayload: function (oData) {
            return {
                InvoiceId: this._getNextInvoiceId(),
                InvoiceNumber: oData.InvoiceNumber,
                VendorName: oData.VendorName,
                VendorId: "",
                InvoiceDate: oData.InvoiceDate,
                DueDate: oData.DueDate,
                PostingDate: null,
                NetAmount: "0.00",
                TaxAmount: "0.00",
                GrossAmount: "0.00",
                Currency: oData.Currency,
                Status: "Draft",
                PaymentTerms: "",
                CompanyCode: ""
            };
        },

        _getNextInvoiceId: function () {
            return "INV-" + Date.now();
        },

        _getInitialCreateData: function () {
            return {
                InvoiceNumber: "",
                VendorName: "",
                InvoiceDate: null,
                Currency: "",
                DueDate: null
            };
        },

        _getInitialCreateValueState: function () {
            return {
                InvoiceNumber: "None",
                VendorName: "None",
                InvoiceDate: "None",
                Currency: "None",
                DueDate: "None"
            };
        },

        _closeCreateDialog: function () {
            if (this._pCreateDialog) {
                this._pCreateDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        },

        _copyDate: function (oDate) {
            return new Date(oDate.getFullYear(), oDate.getMonth(), oDate.getDate());
        },

        _atStartOfDay: function (oDate) {
            return new Date(oDate.getFullYear(), oDate.getMonth(), oDate.getDate(), 0, 0, 0, 0);
        },

        _atEndOfDay: function (oDate) {
            return new Date(oDate.getFullYear(), oDate.getMonth(), oDate.getDate(), 23, 59, 59, 999);
        },

        _getText: function (sKey) {
            var oI18nModel = this.getView().getModel("i18n") || this.getOwnerComponent().getModel("i18n");

            return oI18nModel ? oI18nModel.getResourceBundle().getText(sKey) : sKey;
        }
    });
});
