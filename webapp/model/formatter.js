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
        }
    };
});
