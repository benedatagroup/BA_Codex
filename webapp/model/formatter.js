sap.ui.define([], function () {
    "use strict";

    return {
        statusState: function (sStatus) {
            switch (sStatus) {
                case "Posted":
                    return "Success";
                case "Draft":
                    return "Error";
                default:
                    return "None";
            }
        },

        amount: function (vAmount) {
            var fAmount = Number(vAmount);

            if (Number.isNaN(fAmount)) {
                return "";
            }

            return fAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        },

        quantity: function (vQuantity) {
            var fQuantity = Number(vQuantity);

            if (Number.isNaN(fQuantity)) {
                return "";
            }

            return fQuantity.toLocaleString(undefined, {
                minimumFractionDigits: 3,
                maximumFractionDigits: 3
            });
        },

        percent: function (vPercent) {
            var fPercent = Number(vPercent);

            if (Number.isNaN(fPercent)) {
                return "";
            }

            return fPercent.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }) + " %";
        }
    };
});
