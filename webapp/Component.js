sap.ui.define([
    "sap/ui/core/UIComponent",
    "bacodex/model/models",
    "bacodex/localService/mockserver"
], (UIComponent, models, mockserver) => {
    "use strict";

    mockserver.init();

    return UIComponent.extend("bacodex.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();
        }
    });
});
