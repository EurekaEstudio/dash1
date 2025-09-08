import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
}) => {
  const totalPages = Math.ceil(totalCount / pageSize);
  if (totalPages <= 1) return null;

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 text-gray-300">
      <p>
        Mostrando página <span className="font-semibold">{currentPage}</span> de <span className="font-semibold">{totalPages}</span>
      </p>
      <div className="flex space-x-2">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
        >
          Anterior
        </button>
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};

export default Pagination;
