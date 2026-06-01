sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "bacodex/model/formatter"
], function (Controller, Fragment, JSONModel, MessageBox, MessageToast, formatter) {
    "use strict";
    /* global Promise */

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
                itemData: {
                    Description: "",
                    Quantity: "1.000",
                    UnitPrice: "0.00",
                    TaxRate: "19.00"
                },
                valueState: {
                    VendorName: "None",
                    Currency: "None",
                    DueDate: "None"
                },
                itemValueState: {
                    Description: "None",
                    Quantity: "None",
                    UnitPrice: "None",
                    TaxRate: "None"
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

        onAddInvoiceItem: function () {
            var oView = this.getView(),
                oEditModel = oView.getModel("editView");

            if (!oView.getBindingContext()) {
                return;
            }

            oEditModel.setProperty("/itemData", {
                Description: "",
                Quantity: "1.000",
                UnitPrice: "0.00",
                TaxRate: "19.00"
            });
            oEditModel.setProperty("/itemValueState", this._getInitialItemValueState());

            if (!this._pItemDialog) {
                this._pItemDialog = Fragment.load({
                    id: oView.getId(),
                    name: "bacodex.view.InvoiceItemDialog",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._pItemDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        onSaveInvoiceItem: function () {
            var oView = this.getView(),
                oModel = oView.getModel(),
                oContext = oView.getBindingContext(),
                oEditModel = oView.getModel("editView"),
                oItemData = oEditModel.getProperty("/itemData"),
                oParsedItem = this._validateInvoiceItemData(oItemData);

            if (!oContext || !oParsedItem.valid) {
                MessageBox.error(this._getText("invoiceValidationError"));
                return;
            }

            oEditModel.setProperty("/busy", true);

            oModel.create("/InvoiceItems", this._createInvoiceItemPayload(oContext, oParsedItem), {
                success: function () {
                    MessageToast.show(this._getText("invoiceItemSaveSuccess"));
                    this._closeItemDialog();
                    this._recalculateInvoiceAmounts(oContext);
                }.bind(this),
                error: function () {
                    MessageBox.error(this._getText("invoiceItemSaveError"));
                    oEditModel.setProperty("/busy", false);
                }.bind(this)
            });
        },

        onCancelInvoiceItem: function () {
            this._closeItemDialog();
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
            oEditModel.setProperty("/itemValueState", this._getInitialItemValueState());
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

        _validateInvoiceItemData: function (oData) {
            var oValueState = this._getInitialItemValueState(),
                fQuantity = this._parseDecimal(oData.Quantity),
                fUnitPrice = this._parseDecimal(oData.UnitPrice),
                fTaxRate = this._parseDecimal(oData.TaxRate),
                bValid = true;

            if (!oData.Description || !oData.Description.trim()) {
                oValueState.Description = "Error";
                bValid = false;
            }

            if (Number.isNaN(fQuantity) || fQuantity <= 0) {
                oValueState.Quantity = "Error";
                bValid = false;
            }

            if (Number.isNaN(fUnitPrice) || fUnitPrice < 0) {
                oValueState.UnitPrice = "Error";
                bValid = false;
            }

            if (Number.isNaN(fTaxRate) || fTaxRate < 0) {
                oValueState.TaxRate = "Error";
                bValid = false;
            }

            this.getView().getModel("editView").setProperty("/itemValueState", oValueState);

            return {
                valid: bValid,
                Description: bValid ? oData.Description.trim() : "",
                Quantity: fQuantity,
                UnitPrice: fUnitPrice,
                TaxRate: fTaxRate
            };
        },

        _createInvoiceItemPayload: function (oInvoiceContext, oParsedItem) {
            var fNetAmount = this._roundCurrency(oParsedItem.Quantity * oParsedItem.UnitPrice),
                fTaxAmount = this._roundCurrency(fNetAmount * oParsedItem.TaxRate / 100),
                fGrossAmount = this._roundCurrency(fNetAmount + fTaxAmount);

            return {
                InvoiceId: oInvoiceContext.getProperty("InvoiceId"),
                ItemId: this._getNextItemId(),
                Description: oParsedItem.Description,
                Quantity: oParsedItem.Quantity.toFixed(3),
                UnitPrice: oParsedItem.UnitPrice.toFixed(2),
                TaxRate: oParsedItem.TaxRate.toFixed(2),
                TaxCode: "V1",
                NetAmount: fNetAmount.toFixed(2),
                TaxAmount: fTaxAmount.toFixed(2),
                GrossAmount: fGrossAmount.toFixed(2)
            };
        },

        _getNextItemId: function () {
            var oTable = this.byId("invoiceItemsTable"),
                oBinding = oTable && oTable.getBinding("items"),
                aContexts = oBinding ? oBinding.getContexts(0, oBinding.getLength()) : [],
                iMaxItemId = aContexts.reduce(function (iMax, oContext) {
                    return Math.max(iMax, Number(oContext.getProperty("ItemId")) || 0);
                }, 0);

            return String(iMaxItemId + 10);
        },

        _recalculateInvoiceAmounts: function (oInvoiceContext) {
            var oView = this.getView(),
                oModel = oView.getModel(),
                oEditModel = oView.getModel("editView");

            oModel.read(oInvoiceContext.getPath() + "/ToItems", {
                success: function (oData) {
                    var oAmounts = this._sumInvoiceItemAmounts(oData.results || []);

                    this._syncInvoiceTaxItems(oInvoiceContext, oAmounts.TaxItems)
                        .then(function () {
                            oModel.update(oInvoiceContext.getPath(), {
                                NetAmount: oAmounts.NetAmount.toFixed(2),
                                TaxAmount: oAmounts.TaxAmount.toFixed(2),
                                GrossAmount: oAmounts.GrossAmount.toFixed(2)
                            }, {
                                success: function () {
                                    oModel.refresh(true);
                                    oEditModel.setProperty("/busy", false);
                                },
                                error: function () {
                                    MessageBox.error(this._getText("invoiceSaveError"));
                                    oEditModel.setProperty("/busy", false);
                                }.bind(this)
                            });
                        }.bind(this))
                        .catch(function () {
                            MessageBox.error(this._getText("invoiceSaveError"));
                            oEditModel.setProperty("/busy", false);
                        }.bind(this));
                }.bind(this),
                error: function () {
                    MessageBox.error(this._getText("invoiceSaveError"));
                    oEditModel.setProperty("/busy", false);
                }.bind(this)
            });
        },

        _sumInvoiceItemAmounts: function (aItems) {
            var mTaxItemsByRate = {},
                oTotals = aItems.reduce(function (oResult, oItem) {
                    var fNetAmount = Number(oItem.NetAmount) || 0,
                        fTaxRate = Number(oItem.TaxRate) || 0,
                        sTaxRate = fTaxRate.toFixed(2);

                    oResult.NetAmount += fNetAmount;
                    oResult.TaxAmount += Number(oItem.TaxAmount) || 0;
                    oResult.GrossAmount += Number(oItem.GrossAmount) || 0;

                    if (!mTaxItemsByRate[sTaxRate]) {
                        mTaxItemsByRate[sTaxRate] = {
                            TaxRate: fTaxRate,
                            TaxBase: 0
                        };
                    }

                    mTaxItemsByRate[sTaxRate].TaxBase += fNetAmount;

                    return oResult;
                }, {
                NetAmount: 0,
                TaxAmount: 0,
                GrossAmount: 0,
                TaxItems: []
            });

            oTotals.TaxItems = Object.keys(mTaxItemsByRate).sort(function (sFirstRate, sSecondRate) {
                return Number(sFirstRate) - Number(sSecondRate);
            }).map(function (sTaxRate) {
                var oTaxItem = mTaxItemsByRate[sTaxRate],
                    fTaxBase = this._roundCurrency(oTaxItem.TaxBase),
                    fTaxAmount = this._roundCurrency(fTaxBase * oTaxItem.TaxRate / 100);

                return {
                    TaxRate: oTaxItem.TaxRate,
                    TaxBase: fTaxBase,
                    TaxAmount: fTaxAmount
                };
            }.bind(this));

            oTotals.TaxAmount = oTotals.TaxItems.reduce(function (fTotal, oTaxItem) {
                return fTotal + oTaxItem.TaxAmount;
            }, 0);
            oTotals.GrossAmount = oTotals.NetAmount + oTotals.TaxAmount;

            return oTotals;
        },

        _syncInvoiceTaxItems: function (oInvoiceContext, aTaxItems) {
            var oModel = this.getView().getModel(),
                sInvoiceId = oInvoiceContext.getProperty("InvoiceId");

            return this._readNavigation(oInvoiceContext.getPath() + "/ToTaxItems")
                .then(function (aExistingTaxItems) {
                    return Promise.all(aExistingTaxItems.map(function (oTaxItem) {
                        return this._removeEntity(oModel.createKey("/TaxItems", {
                            TaxItemId: oTaxItem.TaxItemId
                        }));
                    }.bind(this)));
                }.bind(this))
                .then(function () {
                    return Promise.all(aTaxItems.map(function (oTaxItem, iIndex) {
                        return this._createEntity("/TaxItems", {
                            TaxItemId: sInvoiceId + "-TAX-" + String(iIndex + 1).padStart(3, "0"),
                            InvoiceId: sInvoiceId,
                            TaxRate: oTaxItem.TaxRate.toFixed(2),
                            TaxBase: oTaxItem.TaxBase.toFixed(2),
                            TaxAmount: oTaxItem.TaxAmount.toFixed(2)
                        });
                    }.bind(this)));
                }.bind(this));
        },

        _readNavigation: function (sPath) {
            var oModel = this.getView().getModel();

            return new Promise(function (resolve, reject) {
                oModel.read(sPath, {
                    success: function (oData) {
                        resolve(oData.results || []);
                    },
                    error: reject
                });
            });
        },

        _createEntity: function (sPath, oPayload) {
            var oModel = this.getView().getModel();

            return new Promise(function (resolve, reject) {
                oModel.create(sPath, oPayload, {
                    success: resolve,
                    error: reject
                });
            });
        },

        _removeEntity: function (sPath) {
            var oModel = this.getView().getModel();

            return new Promise(function (resolve, reject) {
                oModel.remove(sPath, {
                    success: resolve,
                    error: reject
                });
            });
        },

        _closeItemDialog: function () {
            if (this._pItemDialog) {
                this._pItemDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }
        },

        _getInitialItemValueState: function () {
            return {
                Description: "None",
                Quantity: "None",
                UnitPrice: "None",
                TaxRate: "None"
            };
        },

        _parseDecimal: function (vValue) {
            return Number(String(vValue).replace(",", "."));
        },

        _roundCurrency: function (fValue) {
            return Math.round((fValue + Number.EPSILON) * 100) / 100;
        },

        _getText: function (sKey) {
            return this.getView().getModel("i18n").getResourceBundle().getText(sKey);
        }
    });
});
