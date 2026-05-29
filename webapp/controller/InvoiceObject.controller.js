sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "bacodex/model/formatter"
], function (Controller, JSONModel, MessageBox, MessageToast, formatter) {
    "use strict";

    return Controller.extend("bacodex.controller.InvoiceObject", {
        formatter: formatter,

        onInit: function () {
            this.getView().setModel(new JSONModel({
                editMode: false,
                busy: false,
                data: {
                    VendorName: "",
                    Currency: "",
                    DueDate: null
                },
                valueState: {
                    VendorName: "None",
                    Currency: "None",
                    DueDate: "None"
                }
            }), "editView");

            this.getOwnerComponent().getRouter()
                .getRoute("RouteInvoiceObject")
                .attachPatternMatched(this._onObjectMatched, this);
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteInvoiceList");
        },

        onEdit: function () {
            var oContext = this.getView().getBindingContext();

            if (!oContext) {
                return;
            }

            this._setEditData(oContext.getObject());
            this.getView().getModel("editView").setProperty("/editMode", true);
        },

        onCancel: function () {
            this._resetEditState();
        },

        onSave: function () {
            var oView = this.getView(),
                oContext = oView.getBindingContext(),
                oEditModel = oView.getModel("editView"),
                oData = oEditModel.getProperty("/data");

            if (!oContext || !this._validateEditData(oData)) {
                MessageBox.error(this._getText("invoiceValidationError"));
                return;
            }

            oEditModel.setProperty("/busy", true);

            oView.getModel().update(oContext.getPath(), {
                VendorName: oData.VendorName.trim(),
                Currency: oData.Currency.trim().toUpperCase(),
                DueDate: oData.DueDate
            }, {
                success: function () {
                    MessageToast.show(this._getText("invoiceSaveSuccess"));
                    this._resetEditState();
                }.bind(this),
                error: function () {
                    MessageBox.error(this._getText("invoiceSaveError"));
                    oEditModel.setProperty("/busy", false);
                }.bind(this)
            });
        },

        _onObjectMatched: function (oEvent) {
            var sInvoiceId = decodeURIComponent(oEvent.getParameter("arguments").invoiceId),
                sPath = this.getOwnerComponent().getModel().createKey("/Invoices", {
                    InvoiceId: sInvoiceId
                });

            this._resetEditState();

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
        },

        _setEditData: function (oInvoice) {
            var oEditModel = this.getView().getModel("editView");

            oEditModel.setProperty("/data", {
                VendorName: oInvoice.VendorName || "",
                Currency: oInvoice.Currency || "",
                DueDate: oInvoice.DueDate ? new Date(oInvoice.DueDate.getTime()) : null
            });
            oEditModel.setProperty("/valueState", {
                VendorName: "None",
                Currency: "None",
                DueDate: "None"
            });
        },

        _resetEditState: function () {
            var oEditModel = this.getView().getModel("editView");

            if (!oEditModel) {
                return;
            }

            oEditModel.setProperty("/editMode", false);
            oEditModel.setProperty("/busy", false);
            oEditModel.setProperty("/valueState", {
                VendorName: "None",
                Currency: "None",
                DueDate: "None"
            });
        },

        _validateEditData: function (oData) {
            var oValueState = {
                    VendorName: "None",
                    Currency: "None",
                    DueDate: "None"
                },
                bValid = true,
                oToday = new Date(),
                oDueDate = oData.DueDate;

            oToday.setHours(0, 0, 0, 0);

            if (!oData.VendorName || !oData.VendorName.trim()) {
                oValueState.VendorName = "Error";
                bValid = false;
            }

            if (!oData.Currency || !oData.Currency.trim()) {
                oValueState.Currency = "Error";
                bValid = false;
            }

            if (!(oDueDate instanceof Date) || isNaN(oDueDate.getTime())) {
                oValueState.DueDate = "Error";
                bValid = false;
            } else {
                oDueDate = new Date(oDueDate.getTime());
                oDueDate.setHours(0, 0, 0, 0);

                if (oDueDate < oToday) {
                    oValueState.DueDate = "Error";
                    bValid = false;
                }
            }

            this.getView().getModel("editView").setProperty("/valueState", oValueState);

            return bValid;
        },

        _getText: function (sKey) {
            return this.getView().getModel("i18n").getResourceBundle().getText(sKey);
        }
    });
});
