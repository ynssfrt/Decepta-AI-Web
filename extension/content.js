// This script is injected into the active tab to extract the DOM
(() => {
    return {
        html: document.documentElement.outerHTML,
        text: document.body.innerText
    };
})();
