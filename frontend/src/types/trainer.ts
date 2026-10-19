export interface LinkItem {
    href: string;
}

export interface CustomerLinks {
    self: LinkItem;
    customer: LinkItem;
    trainings: LinkItem;
}
export interface TrainingLinks {
    self: LinkItem;
    training: LinkItem;
    customer: LinkItem;
}
export interface Customer {
    firstname: string;
    lastname: string;
    streetaddress: string;
    postcode: string;
    city: string;
    email: string;
    phone: string;
    _links: CustomerLinks;
};

export interface Training {
    id?: number;
    date: string;
    duration: string;
    activity: string;
    _links: TrainingLinks;
}