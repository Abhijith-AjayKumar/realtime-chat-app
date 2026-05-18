import { useEffect, useState } from "react";
import { baseUrl, getRequest } from "../utils/services";

export const useFetchRecipientUser = (chat, user) => {
    const [recipientUser, setRecipientUser] = useState(null);
    const [error, setError] = useState(null);

    const recipientId = chat?.members?.find((id) => id !== user?._id);

    useEffect(() => {
        const getUser = async () => {
            if (!recipientId || chat?.isGroup) {
                setRecipientUser(null);
                return null;
            }
            
            const response = await getRequest(`${baseUrl}/users`);
            if (response.error) return setError(response);
            
            const recipient = response.find((u) => u._id === recipientId);
            setRecipientUser(recipient);
        };
        getUser();
    }, [recipientId, chat]);

    return { recipientUser, error };
};