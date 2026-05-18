export const baseUrl = "http://localhost:5000/app";

export const postRequest = async (url, body) => {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        // We stringify the body here because fetch expects a JSON string, not a JavaScript object
        body: JSON.stringify(body), 
    });

    

    const data = await response.json();

    if (!response.ok) {
        let message;

        if (data?.message) {
            message = data.message;
        } else {
            message = data;
        }

        return { error: true, message };
    }

    return data; 
};

export const getRequest = async (url) => {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        let message = "An error occurred...";
        if (data?.message) {
            message = data.message;
        } else if (typeof data === "string") {
            message = data;
        }
        return { error: true, message };
    }

    return data;
};


export const deleteRequest = async (url) => {
    const response = await fetch(url, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
    });

    const data = await response.json();

    if (!response.ok) {
        let message = "An error occurred...";
        if (data?.message) {
            message = data.message;
        } else if (typeof data === "string") {
            message = data;
        }
        return { error: true, message };
    }

    return data;
};

export const putRequest = async (url, body) => {
    const response = await fetch(url, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
        let message = "An error occurred...";
        if (data?.message) {
            message = data.message;
        } else if (typeof data === "string") {
            message = data;
        }
        return { error: true, message };
    }

    return data;
};