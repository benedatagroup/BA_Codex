sap.ui.define([
    "sap/ui/core/util/MockServer"
], function (MockServer) {
    "use strict";

    var sServiceUrl = "/sap/opu/odata/sap/ZINVOICE_MANAGEMENT_SRV/";

    return {
        init: function () {
            var oMockServer = new MockServer({
                rootUri: sServiceUrl
            });

            MockServer.config({
                autoRespond: true,
                autoRespondAfter: 300
            });

            oMockServer.simulate(
                sap.ui.require.toUrl("bacodex/localService/metadata.xml"),
                {
                    sMockdataBaseUrl: sap.ui.require.toUrl("bacodex/localService/mockdata"),
                    bGenerateMissingMockData: false
                }
            );

            oMockServer.start();
        }
    };
});
