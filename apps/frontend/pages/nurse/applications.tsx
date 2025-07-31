import React from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import NurseApplicationManager from '../../components/NurseApplicationManager';
import PatientLayout from '../../components/PatientLayout';

const NurseApplicationsPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>My Applications - 3Naya</title>
        <meta name="description" content="Manage your nursing applications" />
      </Head>

      <PatientLayout>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              My Applications
            </h1>
            <p className="text-gray-600">
              Manage your applications to patient requests. You can edit pending applications or cancel them if needed.
            </p>
          </div>

          <NurseApplicationManager />
        </div>
      </PatientLayout>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  // This page is accessible to all authenticated users
  // The component itself will handle role-based access control
  return {
    props: {},
  };
};

export default NurseApplicationsPage;