import { Whop } from '@whop/sdk';

export const getWhopClient = (token?: string) => {
    return new Whop({
        apiKey: process.env.WHOP_API_KEY,
    });
};
